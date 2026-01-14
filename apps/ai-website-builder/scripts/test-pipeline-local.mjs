import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "apps/ai-website-builder");
const promptFile = path.join(root, "data/Prompt.jsx");
const envFile = path.join(root, ".env.local");
const rootEnvFile = path.resolve(process.cwd(), ".env.local");

const userInput =
  "测试 生成一个向小宝宝介绍《小王子》一书的简单网页，内容用法语呈现，配上合适的图片。";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}

function extractPrompt(source, key) {
  const startToken = `${key}: dedent\``;
  const start = source.indexOf(startToken);
  if (start === -1) throw new Error(`Prompt template not found: ${key}`);
  const contentStart = start + startToken.length;
  const endToken = "\n    `,";
  const end = source.indexOf(endToken, contentStart);
  if (end === -1) throw new Error(`Prompt template end not found: ${key}`);
  return source.slice(contentStart, end).trim();
}

function fillTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function safeJsonParse(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty model response");
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  let start = firstBrace;
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
  }
  if (start === -1) throw new Error("No JSON object/array found");
  const endBrace = trimmed.lastIndexOf("}");
  const endBracket = trimmed.lastIndexOf("]");
  let end = endBrace;
  if (endBracket !== -1 && endBracket > endBrace) {
    end = endBracket;
  }
  if (end === -1) throw new Error("No JSON end found");
  const jsonText = trimmed.slice(start, end + 1);
  return JSON.parse(jsonText);
}

async function generateContent(prompt, generationConfig) {
  const envLocal = readEnvFile(envFile);
  const rootEnvLocal = readEnvFile(rootEnvFile);
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    envLocal.GEMINI_API_KEY ||
    envLocal.NEXT_PUBLIC_GEMINI_API_KEY ||
    rootEnvLocal.GEMINI_API_KEY ||
    rootEnvLocal.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const model =
    process.env.GEMINI_MODEL ||
    envLocal.GEMINI_MODEL ||
    rootEnvLocal.GEMINI_MODEL ||
    "gemini-3-pro";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: generationConfig,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function run() {
  const promptSource = fs.readFileSync(promptFile, "utf8");
  const structureTemplate = extractPrompt(promptSource, "STRUCTURE_PLAN_PROMPT");
  const layoutTemplate = extractPrompt(promptSource, "LAYOUT_PLAN_PROMPT");
  const assetTemplate = extractPrompt(promptSource, "ASSET_PLAN_PROMPT");

  const structurePrompt = fillTemplate(structureTemplate, {
    USER_INPUT: userInput,
  });

  const structureText = await generateContent(structurePrompt, {
    temperature: 0.6,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  });
  const structurePlan = safeJsonParse(structureText);

  const layoutPrompt = fillTemplate(layoutTemplate, {
    STRUCTURE_PLAN: JSON.stringify(structurePlan),
  });
  const layoutText = await generateContent(layoutPrompt, {
    temperature: 0.5,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  });
  const layoutPlan = safeJsonParse(layoutText);

  const assetPrompt = fillTemplate(assetTemplate, {
    STRUCTURE_PLAN: JSON.stringify(structurePlan),
    LAYOUT_PLAN: JSON.stringify(layoutPlan),
  });
  const assetText = await generateContent(assetPrompt, {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  });
  const assetPlan = safeJsonParse(assetText);

  const summary = {
    site_title: structurePlan.site_title,
    sections: structurePlan.sections?.map((section) => ({
      id: section.id,
      title: section.title,
      blocks: section.blocks?.map((block) => ({
        block_id: block.block_id,
        type: block.type,
        source_range: block.source_range,
      })),
    })),
    layout: layoutPlan.sections?.map((section) => ({
      id: section.id,
      layout: section.layout,
      blocks: section.blocks?.map((block) => ({
        block_id: block.block_id,
        component: block.component,
      })),
    })),
    images: assetPlan.images?.map((img) => ({
      asset_id: img.asset_id,
      block_id: img.block_id,
      summary: img.summary,
      style_anchor: img.style_anchor,
    })),
    books: assetPlan.books,
  };

  console.log("\n=== Pipeline Test Result ===\n");
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((err) => {
  console.error("Pipeline test failed:", err.message);
  process.exit(1);
});
