import { NextResponse } from "next/server";
import { z } from "zod";
import { PageSchema, createDefaultPage } from "@/lib/web-builder/dsl";

export const runtime = "nodejs";

const RequestSchema = z.object({
  prompt: z.string().min(1),
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

function parsePage(text: string) {
  const cleaned = sanitizeJson(text);
  const json = extractJsonObject(cleaned);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    const result = PageSchema.safeParse(parsed);
    if (!result.success) {
      return { error: result.error, page: null };
    }
    return { page: result.data, error: null };
  } catch (error) {
    return { error, page: null };
  }
}

async function callGemini(apiKey: string, model: string, prompt: string) {
  const response = await fetch(
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
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1600,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text);
  }
  const data = JSON.parse(text) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("");
}

function buildPrompt(userPrompt: string) {
  const seed = createDefaultPage();
  return [
    "你是页面生成器，只输出严格 JSON。",
    "目标：生成符合 Page DSL 的 JSON，不能输出 HTML 字符串。",
    "字段必须包含：id, title, tokens, root。",
    "tokens 需要包含 colors, space, fontSizes。",
    "root 必须是 container 类型，并包含 children。",
    "style 允许使用 tokens 引用，例如 $colors.primary 或 $space.md。",
    "不要输出任何解释或 markdown。",
    `参考 tokens: ${JSON.stringify(seed.tokens)}`,
    `用户需求：${userPrompt}`,
  ].join("\n");
}

function buildRepairPrompt(original: string, errorMessage: string) {
  return [
    "下面的 JSON 不符合 Page DSL，请修复为合法 JSON。",
    "只输出修复后的 JSON，不要输出解释。",
    `错误：${errorMessage}`,
    "原始输出：",
    original,
  ].join("\n");
}

function fallbackPage(prompt: string) {
  const page = createDefaultPage();
  page.title = "AI Page";
  page.root.children = [
    {
      id: "hero-title",
      type: "text",
      props: { text: "AI Generated Page", tag: "h1" },
      style: { fontSize: "$fontSizes.xxl", margin: "$space.md" },
    },
    {
      id: "hero-body",
      type: "text",
      props: { text: prompt, tag: "p" },
      style: { fontSize: "$fontSizes.base", color: "$colors.muted" },
    },
  ];
  return page;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Missing prompt" },
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

    const first = await callGemini(apiKey, model, buildPrompt(parsed.data.prompt));
    let result = parsePage(first);
    if (!result?.page) {
      const errorMessage =
        result?.error instanceof Error
          ? result.error.message
          : "Validation failed";
      const repaired = await callGemini(
        apiKey,
        model,
        buildRepairPrompt(first, errorMessage)
      );
      result = parsePage(repaired);
    }

    if (!result?.page) {
      return NextResponse.json(
        { ok: true, page: fallbackPage(parsed.data.prompt), warning: "fallback" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, page: result.page });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "AI generate failed" },
      { status: 500 }
    );
  }
}
