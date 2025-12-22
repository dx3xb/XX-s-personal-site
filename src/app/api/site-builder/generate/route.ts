import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";
import {
  ImagePlanSchema,
  PagePlanSchema,
  detectRequestedImageCount,
  normalizePagePlan,
} from "@/lib/site-builder/plan";

export const runtime = "nodejs";

const MAX_HTML_LENGTH = 200_000;

type MessageRow = {
  id: string;
};

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

function buildFallbackPlan(prompt: string) {
  return normalizePagePlan(
    {
      page_title: "Site Builder",
      audience: "大众用户",
      tone: "清晰、友好、结构化",
      content_outline: {
        begin: "故事开始，引出主题。",
        middle: "故事发展，呈现关键事件。",
        end: "故事收束，总结亮点。",
      },
      modules: [],
      image_slots: [],
    },
    prompt,
    detectRequestedImageCount(prompt)
  );
}

function extractHtmlDocument(text: string) {
  const normalized = text.replace(/\\n/g, "\n").replace(/\\"/g, "\"");
  const lower = normalized.toLowerCase();
  let start = lower.indexOf("<!doctype");
  if (start === -1) {
    start = lower.indexOf("<html");
  }
  if (start === -1) return null;
  let end = lower.lastIndexOf("</html>");
  if (end !== -1) {
    end += "</html>".length;
  } else {
    end = normalized.length;
  }
  return normalized.slice(start, end).trim();
}

function extractTitleFromHtml(html: string) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let projectId = String(body?.project_id ?? "").trim();
    let prompt = String(body?.prompt ?? "").trim();

    if (!projectId && !prompt) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id or prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "GEMINI_API_KEY is not configured" },
        { status: 400 }
      );
    }

    let existingTitle = "";
    if (projectId) {
      const rows = await query<{ user_prompt: string; title: string | null }>(
        `select user_prompt, title from public.projects where id = $1`,
        [projectId]
      );
      if (!rows[0]) {
        return NextResponse.json(
          { ok: false, error: "Project not found" },
          { status: 404 }
        );
      }
      if (!prompt) {
        prompt = rows[0].user_prompt;
      }
      existingTitle = (rows[0].title ?? "").trim();
    } else {
      const rows = await query<{ id: string }>(
        `insert into public.projects (title, user_prompt)
         values ($1, $2)
         returning id`,
        ["Site Builder", prompt]
      );
      projectId = rows[0].id;
    }

    await query<MessageRow>(
      `insert into public.conversations (project_id, role, content)
       values ($1, 'user', $2)`,
      [projectId, prompt]
    );

    const requestedCount = detectRequestedImageCount(prompt);
    const specResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    `只输出严格 JSON，字段必须包含：page_title, audience, tone, content_outline, modules, image_slots。\n` +
                    `不要输出任何解释或多余文本。\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1200,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                page_title: { type: "string" },
                audience: { type: "string" },
                tone: { type: "string" },
                content_outline: {
                  type: "object",
                  properties: {
                    begin: { type: "string" },
                    middle: { type: "string" },
                    end: { type: "string" },
                  },
                  required: ["begin", "middle", "end"],
                },
                modules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      type: { type: "string" },
                      text_ref: { type: "string" },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            text_ref: { type: "string" },
                          },
                          required: ["id", "title", "text_ref"],
                        },
                      },
                    },
                    required: ["id", "title", "type", "text_ref"],
                  },
                },
                image_slots: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      usage: { type: "string" },
                      section: { type: "string" },
                      module_id: { type: "string" },
                      item_id: { type: "string" },
                    },
                    required: ["id", "usage", "section"],
                  },
                },
              },
              required: ["page_title", "audience", "tone", "content_outline", "modules", "image_slots"],
            },
          },
        }),
      }
    );

    if (!specResponse.ok) {
      const errorText = await specResponse.text();
      return NextResponse.json(
        { ok: false, error: `AI spec failed: ${errorText}` },
        { status: 502 }
      );
    }

    const specData = await specResponse.json();
    const specRaw =
      specData?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? "")
        .join("") || "";

    let plan: z.infer<typeof PagePlanSchema> | null = null;
    const cleanedSpec = specRaw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "");
    const candidateJson = sanitizeJson(
      extractJsonObject(cleanedSpec) || cleanedSpec
    );
    try {
      const parsed = JSON.parse(candidateJson);
      const validated = PagePlanSchema.safeParse(parsed);
      if (validated.success) {
        plan = validated.data;
      } else {
        plan = null;
      }
    } catch {
      plan = null;
    }

    const normalizedPlan = plan
      ? normalizePagePlan(plan, prompt, requestedCount)
      : buildFallbackPlan(prompt);

    const requestBody = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `只输出严格 JSON，字段必须包含：title, content_text, html, image_plan。\n` +
                `content_text 为“准备生成的文字内容”，只包含纯文字，不含 HTML。\n` +
                `html 必须是完整 HTML 文档，包含 <!doctype html> 与 <html>。\n` +
                `image_plan 为图片计划：{ images: [{ id, usage, section, prompt, negative_prompt, style, aspect_ratio, size, seed }] }。\n` +
                `必须为每张图片提供中文 prompt，且 html 内需预先放好 data-sb-image 占位符，id 与 image_plan.images[].id 对应。\n` +
                `不得输出任何解释或多余文本。\n` +
                `必须最大程度还原用户输入的文字内容；若输入含糊，先补全合理内容再写 HTML。\n` +
                `文档内必须包含合适数量的图片（使用 data-sb-image 占位符）。\n\n` +
                `${prompt}\n\n${JSON.stringify(normalizedPlan)}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1800,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content_text: { type: "string" },
            html: { type: "string" },
            image_plan: {
              type: "object",
              properties: {
                images: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      usage: { type: "string" },
                      section: { type: "string" },
                      prompt: { type: "string" },
                      negative_prompt: { type: "string" },
                      style: { type: "string" },
                      aspect_ratio: { type: "string" },
                      size: { type: "string" },
                      seed: { type: "number" },
                    },
                    required: ["id", "usage", "section", "prompt"],
                  },
                },
              },
              required: ["images"],
            },
          },
          required: ["title", "content_text", "html", "image_plan"],
        },
      },
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const headers = {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    };

    let response: Response | null = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      response = await fetch(url, { method: "POST", headers, body: requestBody });
      if (response.ok) {
        break;
      }
      const errorText = await response.text();
      if (response.status !== 503 || attempt === maxAttempts) {
        return NextResponse.json(
          { ok: false, error: `AI request failed: ${errorText}` },
          { status: 502 }
        );
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 600 * attempt)
      );
    }

    if (!response) {
      return NextResponse.json(
        { ok: false, error: "AI request failed: empty response" },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { ok: false, error: `AI request failed: ${errorText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? "")
        .join("") || "";

    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "AI response was empty" },
        { status: 502 }
      );
    }

    let payload:
      | {
          title?: string;
          html?: string;
          content_text?: string;
          image_plan?: unknown;
        }
      | null;
    const cleaned = sanitizeJson(
      rawText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
    );
    const parseOrNull = (input: string) => {
      try {
        return JSON.parse(input) as typeof payload;
      } catch {
        return null;
      }
    };
    payload = parseOrNull(cleaned) ?? parseOrNull(extractJsonObject(cleaned) || "");

    if (!payload) {
      // Retry with repair prompt when model returns non-JSON text.
      const repairResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      `请把下面内容修复为严格 JSON，仅输出 JSON。\n` +
                      `字段必须包含：title, content_text, html, image_plan。\n` +
                      `content_text 为纯文字；html 为完整 HTML 文档。\n` +
                      `image_plan 为图片计划，包含 images[].\n\n` +
                      `原始输出：\n${rawText}`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 1800,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!repairResponse.ok) {
        const errorText = await repairResponse.text();
        return NextResponse.json(
          { ok: false, error: `AI repair failed: ${errorText}` },
          { status: 502 }
        );
      }

      const repairData = await repairResponse.json();
      const repairText =
        repairData?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text ?? "")
          .join("") || "";
      const cleanedRepair = sanitizeJson(
        repairText
          .trim()
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
      );
      payload =
        parseOrNull(cleanedRepair) ??
        parseOrNull(extractJsonObject(cleanedRepair) || "");
    }

    if (!payload) {
      const fallbackHtml = extractHtmlDocument(cleaned);
      if (fallbackHtml) {
        payload = {
          title: extractTitleFromHtml(fallbackHtml) || "Generated Page",
          content_text: "",
          html: fallbackHtml,
          image_plan: { images: [] },
        };
      } else {
        return NextResponse.json(
          { ok: false, error: "AI response is not valid JSON" },
          { status: 502 }
        );
      }
    }

    let title = String(payload?.title ?? "").trim();
    let html = String(payload?.html ?? "").trim();
    const contentText = String(payload?.content_text ?? "").trim();
    const imagePlanRaw = payload?.image_plan ?? null;
    const imagePlanParsed = ImagePlanSchema.safeParse(imagePlanRaw);

    if (html.startsWith("{") && html.includes("\"html\"")) {
      try {
        const nested = JSON.parse(html);
        if (typeof nested?.html === "string") {
          html = nested.html.trim();
        }
        if (!title && typeof nested?.title === "string") {
          title = nested.title.trim();
        }
      } catch {
        // keep original html
      }
    }

    if (!html.toLowerCase().includes("<html")) {
      const extracted = extractHtmlDocument(html) ?? extractHtmlDocument(rawText);
      if (extracted) {
        html = extracted;
        if (!title) {
          title = extractTitleFromHtml(html);
        }
      }
    }

    if (!title || !html || !contentText) {
      return NextResponse.json(
        { ok: false, error: "AI response missing title, content_text, or html" },
        { status: 502 }
      );
    }
    if (!imagePlanParsed.success || imagePlanParsed.data.images.length === 0) {
      return NextResponse.json(
        { ok: false, error: "AI response missing image_plan" },
        { status: 502 }
      );
    }

    const htmlLower = html.toLowerCase();
    if (!htmlLower.includes("<html") && !htmlLower.includes("<!doctype")) {
      return NextResponse.json(
        { ok: false, error: "Generated html is not a full document" },
        { status: 502 }
      );
    }

    if (html.length > MAX_HTML_LENGTH) {
      return NextResponse.json(
        { ok: false, error: "Generated html is too large" },
        { status: 413 }
      );
    }

    const preferredTitle = normalizedPlan.page_title || title || "Site Builder";
    const finalTitle =
      existingTitle && existingTitle !== "Untitled Project"
        ? existingTitle
        : preferredTitle;

    await query(
      `update public.projects
       set title = $1, generated_html = $2, user_prompt = $3, page_plan = $4, image_plan = $5
       where id = $6`,
      [
        finalTitle,
        html,
        prompt,
        JSON.stringify(normalizedPlan),
        JSON.stringify(imagePlanParsed.data),
        projectId,
      ]
    );

    await query(
      `insert into public.conversations (project_id, role, content)
       values ($1, 'builder', $2)`,
      [projectId, contentText]
    );

    await query(
      `insert into public.conversations (project_id, role, content)
       values ($1, 'builder', $2)`,
      [projectId, html]
    );

    await query(`delete from public.images where project_id = $1`, [projectId]);

    for (const image of imagePlanParsed.data.images) {
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

    return NextResponse.json({
      ok: true,
      title: finalTitle,
      html,
      projectId,
      image_plan: imagePlanParsed.data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to generate site" },
      { status: 500 }
    );
  }
}
