import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import {
  ImagePlanSchema,
  PagePlanSchema,
  detectRequestedImageCount,
  normalizePagePlan,
} from "@/lib/site-builder/plan";

export const runtime = "nodejs";

type ProjectRow = {
  user_prompt: string;
  page_plan: unknown | null;
  generated_html: string | null;
};

type ConversationRow = {
  content: string;
  created_at: string;
};

const ImagePromptSchema = z.object({
  id: z.string().min(1),
  usage: z.string().min(1),
  section: z.string().min(1),
  prompt: z.string().min(8),
  negative_prompt: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  aspect_ratio: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  seed: z.number().int().optional().nullable(),
});

const ImagePayloadSchema = z.object({
  images: z.array(ImagePromptSchema).min(1),
});

function sanitizeJson(input: string) {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/\u2028|\u2029/g, "")
    .replace(/,\s*([}\]])/g, "$1");
}

function extractJsonObject(input: string) {
  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return "";
  return input.slice(first, last + 1);
}

function normalizeSize(size?: string | null, aspectRatio?: string | null) {
  const ratio = (aspectRatio || "").trim();
  const raw = (size || "").trim();
  const fallback = ratio === "1:1" ? "1024x1024" : "1280x720";
  if (!raw) return fallback;
  if (!/^\d+x\d+$/i.test(raw)) return fallback;
  const [w, h] = raw.split("x").map((v) => Number(v));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return fallback;
  if (w * h < 921600) return fallback;
  return raw;
}

function pickStyle(text: string) {
  if (/绘本|童书|宝宝|幼儿|儿童/.test(text)) return "children_book_illustration";
  if (/产品|SaaS|功能|科技公司|官网/.test(text)) return "clean_ui_illustration";
  if (/作品集|摄影|品牌|展览/.test(text)) return "editorial_illustration";
  return "modern_flat_illustration";
}

function extractKeywords(text: string, limit = 6) {
  const stop = new Set([
    "需要",
    "希望",
    "可以",
    "生成",
    "网页",
    "页面",
    "内容",
    "故事",
    "图片",
    "图画",
    "配图",
    "文字",
    "一个",
    "一些",
    "这个",
    "那个",
    "以及",
    "但是",
    "然后",
    "并且",
    "同时",
    "适合",
    "需求",
    "描述",
    "展示",
    "风格",
    "如何",
    "为什么",
    "什么",
  ]);
  const matches = text.match(/[\u4e00-\u9fa5]{2,6}/g) ?? [];
  const freq = new Map<string, number>();
  for (const token of matches) {
    if (stop.has(token)) continue;
    if (/[、或…]/.test(token)) continue;
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .slice(0, limit);
}

function buildPromptFromText(
  usage: string,
  section: string,
  text: string,
  style: string,
  keywords: string[]
) {
  const subject = keywords[0] || "核心主体";
  const scene = keywords[1] || "与页面内容相符的场景";
  const action = keywords[2] || "正在展示核心主题";
  const tone = /温馨|柔和|暖/.test(text) ? "温暖柔和" : "清晰现代";
  const composition =
    section === "hero" ? "居中主视觉，左右留白" : "主体突出，信息层级清晰";
  return [
    `主体：${subject}。`,
    `场景：${scene}。`,
    `动作：${action}。`,
    `用途：${usage}。`,
    `风格：${style}，${tone}。`,
    `光线：柔和自然光。`,
    `构图：${composition}。`,
    `画面内无文字、无水印。`,
  ].join(" ");
}

function deriveSlots(
  normalizedPlan: ReturnType<typeof normalizePagePlan>,
  contentText: string,
  userPrompt: string
) {
  const slots: Array<{ id: string; usage: string; section: string; text: string }> = [];
  const modules = normalizedPlan.modules ?? [];
  if (modules.length) {
    for (const module of modules) {
      slots.push({
        id: `mod-${module.id}-img`,
        usage: module.title || "模块配图",
        section: "module",
        text: module.text_ref || contentText,
      });
      if (module.items?.length) {
        for (const item of module.items) {
          slots.push({
            id: `item-${item.id}-img`,
            usage: item.title || "内容配图",
            section: "item",
            text: item.text_ref || contentText,
          });
        }
      }
    }
  }

  const storySections = /开始|发展|结尾|起承转合/.test(contentText)
    ? [
        { id: "start-image", usage: "故事开端配图", section: "begin" },
        { id: "middle-image", usage: "故事发展配图", section: "middle" },
        { id: "end-image", usage: "故事结尾配图", section: "end" },
      ]
    : [];

  if (!slots.length && storySections.length) {
    storySections.forEach((slot) =>
      slots.push({ ...slot, text: contentText })
    );
  }

  if (!slots.length) {
    const paragraphs = contentText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 3);
    paragraphs.forEach((para, index) => {
      slots.push({
        id: `section-${index + 1}`,
        usage: `内容配图 ${index + 1}`,
        section: "content",
        text: para,
      });
    });
  }

  slots.unshift({
    id: "hero-image",
    usage: "页面主视觉",
    section: "hero",
    text: userPrompt || contentText,
  });

  return slots;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = String(body?.project_id ?? "").trim();

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id" },
        { status: 400 }
      );
    }

    const rows = await query<ProjectRow>(
      `select user_prompt, page_plan, generated_html
       from public.projects where id = $1`,
      [projectId]
    );
    const project = rows[0];
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const conversations = await query<ConversationRow>(
      `select content, created_at from public.conversations
       where project_id = $1 and role = 'builder'
       order by created_at desc limit 6`,
      [projectId]
    );
    const builderHtml = conversations.find((row) => /<html/i.test(row.content));
    const builderText = conversations.find((row) => !/<html/i.test(row.content));
    const contentText = builderText?.content?.trim() || project.user_prompt;

    let planRaw: unknown = project.page_plan;
    if (typeof planRaw === "string") {
      try {
        planRaw = JSON.parse(planRaw);
      } catch {
        planRaw = null;
      }
    }
    const planCandidate = PagePlanSchema.safeParse(planRaw);
    const requestedCount = detectRequestedImageCount(project.user_prompt || "");
    const normalizedPlan = planCandidate.success
      ? normalizePagePlan(planCandidate.data, contentText, requestedCount)
      : normalizePagePlan(
          {
            page_title: "Site Builder",
            audience: "大众用户",
            tone: "清晰、友好、结构化",
            content_outline: {
              begin: "开始段落。",
              middle: "发展段落。",
              end: "结尾段落。",
            },
            image_slots: [],
          },
          contentText,
          requestedCount
        );

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY is not configured" },
        { status: 400 }
      );
    }

    const context = {
      user_prompt: project.user_prompt,
      builder_text: contentText,
      page_plan: normalizedPlan,
      html_outline: builderHtml?.content?.slice(0, 2000) ?? "",
      requested_image_count: requestedCount ?? null,
    };

    const prompt = [
      "你是图片提示词策划。",
      "请根据用户输入与 Builder 输出，决定需要生成的图片数量与位置。",
      "输出严格 JSON：{ images: [{ id, usage, section, prompt, negative_prompt, style, aspect_ratio, size, seed }] }。",
      "prompt 必须是中文，包含主体、场景、动作、风格、光线、构图。",
      "每张图必须与页面内容强相关，不要复用模板句。",
      "数量应根据内容丰富程度判断，可多可少，不设上限。",
      "禁止在画面中出现文字或水印。",
      JSON.stringify(context),
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1600,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    let payload: z.infer<typeof ImagePayloadSchema> | null = null;
    if (response.ok) {
      const data = await response.json();
      const rawText =
        data?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text ?? "")
          .join("") || "";
      if (rawText) {
        const cleaned = sanitizeJson(
          rawText
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
        );
        try {
          payload = JSON.parse(cleaned);
        } catch {
          const candidate = extractJsonObject(cleaned);
          if (candidate) {
            try {
              payload = JSON.parse(candidate);
            } catch {
              payload = null;
            }
          }
        }
      }
    }

    if (!payload) {
      const fallbackSlots = deriveSlots(normalizedPlan, contentText, project.user_prompt);
      const style = pickStyle(contentText);
      const keywords = extractKeywords(`${project.user_prompt} ${contentText}`);
      payload = {
        images: fallbackSlots.map((slot, index) => ({
          id: slot.id,
          usage: slot.usage,
          section: slot.section,
          prompt: buildPromptFromText(
            slot.usage,
            slot.section,
            slot.text,
            style,
            keywords.slice(index, index + 3)
          ),
          negative_prompt:
            "文字,水印,logo,二维码,模糊,血腥,暴力,恐怖,枪械,政治符号,裸露",
          style,
          aspect_ratio: slot.section === "hero" ? "16:9" : "1:1",
          size: normalizeSize(
            null,
            slot.section === "hero" ? "16:9" : "1:1"
          ),
          seed: null,
        })),
      };
    }

    const validated = ImagePayloadSchema.safeParse(payload);
    if (!validated.success) {
      return NextResponse.json(
        { ok: false, error: "Image plan validation failed" },
        { status: 400 }
      );
    }

    const normalizedImages = validated.data.images.map((img) => {
      const hasChinese = /[\u4e00-\u9fa5]/.test(img.prompt);
      const style = img.style || pickStyle(contentText);
      return {
        ...img,
        usage: img.usage || "内容配图",
        section: img.section || "content",
        prompt: hasChinese ? img.prompt : `${img.prompt}（请确保中文描述）`,
        negative_prompt:
          img.negative_prompt ??
          "文字,水印,logo,二维码,模糊,血腥,暴力,恐怖,枪械,政治符号,裸露",
        style,
        aspect_ratio: img.aspect_ratio ?? (img.section === "hero" ? "16:9" : "1:1"),
        size: normalizeSize(img.size, img.aspect_ratio),
        seed: img.seed ?? null,
      };
    });

    const validatedPlan = ImagePlanSchema.safeParse({ images: normalizedImages });
    if (!validatedPlan.success) {
      return NextResponse.json(
        { ok: false, error: "Image plan validation failed" },
        { status: 400 }
      );
    }

    await query(
      `insert into public.conversations (project_id, role, content)
       values ($1, 'image_agent', $2)`,
      [projectId, JSON.stringify({ images: normalizedImages })]
    );

    await query(
      `update public.projects set image_plan = $1 where id = $2`,
      [JSON.stringify({ images: normalizedImages }), projectId]
    );

    await query(`delete from public.images where project_id = $1`, [projectId]);

    for (const image of normalizedImages) {
      await query(
        `insert into public.images (project_id, slot_id, usage, section, prompt, negative_prompt, style, aspect_ratio, size, seed)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          projectId,
          image.id,
          image.usage,
          image.section,
          image.prompt,
          image.negative_prompt ?? null,
          image.style ?? null,
          image.aspect_ratio ?? null,
          image.size ?? null,
          image.seed ?? null,
        ]
      );
    }

    return NextResponse.json({ ok: true, images: normalizedImages });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to generate image prompts" },
      { status: 500 }
    );
  }
}
