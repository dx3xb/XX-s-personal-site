import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Prompt from "@/data/Prompt";
import {
  structurePlanSession,
  layoutPlanSession,
  assetPlanSession,
  scenePlanSession,
  imagePromptSession,
} from "@/configs/AiModel";
import { normalizeText, splitToParagraphs, chunkParagraphs } from "@/lib/chunking";
import { buildContentIndex } from "@/lib/contentIndex";
import { buildImagePrompts } from "@/lib/promptBuilder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PIPELINE_STAGE_TIMEOUT_MS = 45000;
const PIPELINE_POLL_COOLDOWN_MS = 3000;

function renderTemplate(template, data) {
  let output = template;
  Object.entries(data).forEach(([key, value]) => {
    output = output.replace(`{{${key}}}`, value);
  });
  return output;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

function extractJson(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return candidate.slice(firstBrace, lastBrace + 1);
}

function extractJsonArray(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const first = candidate.indexOf("[");
  const last = candidate.lastIndexOf("]");
  if (first === -1 || last === -1 || last <= first) return null;
  return candidate.slice(first, last + 1);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function buildPlaceholderUrl(id, size) {
  const parsed = typeof size === "string" ? size.split("x") : [];
  const width = Number(parsed[0]) || 1200;
  const height = Number(parsed[1]) || 675;
  const text = encodeURIComponent(`Placeholder\n${id}`);
  return `https://placehold.co/${width}x${height}/0f172a/e2e8f0?text=${text}&imageId=${encodeURIComponent(id)}`;
}

function buildShellFiles(sitePayload) {
  const payloadJson = JSON.stringify(sitePayload, null, 2);
  return {
    "/sitePayload.json": { code: payloadJson },
    "/App.js": {
      code: `import React from "react";\nimport payload from "./sitePayload.json";\nimport SiteRenderer from "./components/SiteRenderer";\n\nfunction App() {\n  return <SiteRenderer payload={payload} />;\n}\n\nexport default App;\n`,
    },
  };
}

function ensureStageUpdate(stage, status, output, error) {
  return {
    ...stage,
    status,
    output: output ?? stage.output,
    error: error ?? null,
    startedAt: stage.startedAt || Date.now(),
    completedAt: status === "done" || status === "failed" ? Date.now() : null,
  };
}

async function runStage(stageId, context) {
  const { userInput, paragraphs, contentIndex, structurePlan, layoutPlan } = context;

  if (stageId === "constraints") {
    const prompt = renderTemplate(Prompt.CONSTRAINTS_PROMPT, {
      USER_INPUT: userInput.slice(0, 4000),
    });
    const res = await withTimeout(structurePlanSession.sendMessage(prompt), 20000);
    const text = res?.response?.text?.() || "";
    return safeJsonParse(extractJson(text) || "") || { constraints: [] };
  }

  if (stageId === "sitemap") {
    const prompt = renderTemplate(Prompt.SITEMAP_PROMPT, {
      USER_INPUT: userInput.slice(0, 8000),
    });
    const res = await withTimeout(structurePlanSession.sendMessage(prompt), 20000);
    const text = res?.response?.text?.() || "";
    return safeJsonParse(extractJson(text) || "") || { sections: [] };
  }

  if (stageId === "layout_plan") {
    const prompt = renderTemplate(Prompt.LAYOUT_PLAN_PROMPT, {
      STRUCTURE_PLAN: JSON.stringify(structurePlan),
    });
    const res = await withTimeout(layoutPlanSession.sendMessage(prompt), 20000);
    const text = res?.response?.text?.() || "";
    return safeJsonParse(extractJson(text) || "") || { sections: [] };
  }

  if (stageId === "image_plan") {
    const prompt = renderTemplate(Prompt.ASSET_PLAN_PROMPT, {
      STRUCTURE_PLAN: JSON.stringify(structurePlan),
      LAYOUT_PLAN: JSON.stringify(layoutPlan),
    });
    const res = await withTimeout(assetPlanSession.sendMessage(prompt), 20000);
    const text = res?.response?.text?.() || "";
    return safeJsonParse(extractJson(text) || "") || { images: [], videos: [], books: [] };
  }

  if (stageId === "content_blocks") {
    const blocks = structurePlan.sections.flatMap((section) =>
      section.blocks.map((block) => {
        const start = Math.max(0, Number(block.source_range?.start_pid) || 0);
        const end = Math.min(
          paragraphs.length - 1,
          Number(block.source_range?.end_pid) || start
        );
        return {
          block_id: block.block_id,
          section_id: section.id,
          type: block.type,
          raw_text: paragraphs.slice(start, end + 1),
        };
      })
    );
    return { blocks };
  }

  if (stageId === "codegen_assemble") {
    return { status: "ready" };
  }

  return null;
}

async function buildPipelinePayload(context, assetPlan, layoutPlan) {
  const { paragraphs, contentIndex, structurePlan } = context;
  const structureBlocks = structurePlan.sections.flatMap((section) =>
    section.blocks.map((block) => ({ ...block, section_id: section.id }))
  );

  const layoutMap = new Map(
    layoutPlan.sections.flatMap((section) => section.blocks).map((block) => [block.block_id, block])
  );

  const blocks = structureBlocks.map((block) => {
    const layout = layoutMap.get(block.block_id);
    const start = Math.max(0, Number(block.source_range?.start_pid) || 0);
    const end = Math.min(paragraphs.length - 1, Number(block.source_range?.end_pid) || start);
    const rawText = paragraphs.slice(start, end + 1);
    const images = (assetPlan.images || []).filter((image) => image.block_id === block.block_id);
    const books = (assetPlan.books || []).filter((book) => book.block_id === block.block_id);
    const video = (assetPlan.videos || []).find((item) => item.block_id === block.block_id) || null;
    return {
      block_id: block.block_id,
      section_id: block.section_id,
      type: block.type,
      component: layout?.component || "ProseBlock",
      paragraphs: rawText,
      items: block.type === "grid" ? rawText.slice(0, 4) : [],
      images,
      books,
      video,
    };
  });

  const imagePrompts = [];
  for (const block of blocks) {
    const blockText = block.paragraphs.join("\n");
    if (!block.images || block.images.length === 0) continue;
    let scenePlan = null;
    try {
      const scenePrompt = renderTemplate(Prompt.SCENE_PLAN_PROMPT, {
        USER_INPUT: blockText.slice(0, 2000),
      });
      const sceneRes = await withTimeout(
        scenePlanSession.sendMessage(scenePrompt),
        20000
      );
      const sceneText = sceneRes?.response?.text?.() || "";
      const parsed = safeJsonParse(extractJsonArray(sceneText) || "");
      if (Array.isArray(parsed)) {
        scenePlan = parsed;
      }
    } catch (err) {
      scenePlan = null;
    }

    if (scenePlan && scenePlan.length) {
      const scenes = scenePlan.slice(0, block.images.length);
      for (let i = 0; i < block.images.length; i += 1) {
        const image = block.images[i];
        const scene = scenes[i] || scenes[0];
        let promptText = "";
        try {
          const prompt = renderTemplate(Prompt.IMAGE_PROMPT_FROM_PLAN, {
            SCENE_PLAN: JSON.stringify(scene),
          });
          const resp = await withTimeout(
            imagePromptSession.sendMessage(prompt),
            20000
          );
          const text = resp?.response?.text?.() || "";
          const parsed = safeJsonParse(extractJson(text) || "");
          promptText = parsed?.prompt || "";
        } catch (err) {
          promptText = "";
        }
        imagePrompts.push({
          id: image.asset_id,
          prompt: promptText || image.summary,
          size: "1280x720",
          negative: "text, watermark, logo, blurry, lowres",
        });
      }
    } else {
      const rebuilt = buildImagePrompts({
        userInput: blockText,
        imagePrompts: block.images.map((image) => ({ id: image.asset_id })),
        debug: false,
      });
      rebuilt.prompts.forEach((item) => {
        imagePrompts.push({
          id: item.id,
          prompt: item.prompt,
          size: item.size || "1280x720",
          negative:
            (item.negative || "") + "text, watermark, logo, blurry, lowres",
        });
      });
    }
  }

  const payloadImages = imagePrompts.map((item) => ({
    id: item.id,
    prompt: item.prompt,
    size: item.size,
    negative: item.negative,
    src: buildPlaceholderUrl(item.id, item.size),
  }));
  const payloadImageMap = new Map(payloadImages.map((image) => [image.id, image]));
  const hydratedBlocks = blocks.map((block) => ({
    ...block,
    images: (block.images || []).map((image) =>
      payloadImageMap.get(image.asset_id || image.id) || image
    ),
  }));

  const sitePayload = {
    site_title: structurePlan.site_title || "内容展示",
    toc: contentIndex.toc,
    sections: structurePlan.sections.map((section) => ({
      id: section.id,
      title: section.title,
      blocks: hydratedBlocks.filter((block) => block.section_id === section.id),
    })),
    assets: {
      images: payloadImages,
      books: assetPlan.books || [],
      videos: assetPlan.videos || [],
    },
  };

  const files = buildShellFiles(sitePayload);
  return { files, sitePayload, imagePrompts };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const retryStage = searchParams.get("retryStage");

    if (!jobId) {
      return NextResponse.json({ ok: false, error: "jobId required" });
    }

    const convexUrl =
      process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ ok: false, error: "Convex URL not configured" });
    }

    const client = new ConvexHttpClient(convexUrl);
    if (retryStage) {
      await client.mutation(api.pipeline.ResetPipelineStage, {
        jobId,
        stageId: retryStage,
      });
    }

    const job = await client.query(api.pipeline.GetPipelineJob, { jobId });
    if (!job) {
      return NextResponse.json({ ok: false, error: "job not found" });
    }

    const stages = Array.isArray(job.stages) ? job.stages : [];
    const currentIndex = stages.findIndex((stage) => stage.status === "pending");
    const inProgressIndex = stages.findIndex((stage) => stage.status === "in_progress");
    const nextIndex = inProgressIndex !== -1 ? inProgressIndex : currentIndex;

    let updatedStages = stages;
    let status = job.status || "running";

    if (inProgressIndex !== -1) {
      const activeStage = stages[inProgressIndex];
      const elapsed = Date.now() - (activeStage.startedAt || 0);
      if (elapsed < PIPELINE_POLL_COOLDOWN_MS) {
        return NextResponse.json({
          ok: true,
          jobId,
          status,
          stages: updatedStages,
          chunks: [],
        });
      }
      if (elapsed > PIPELINE_STAGE_TIMEOUT_MS) {
        updatedStages = stages.map((stage) =>
          stage.id === activeStage.id
            ? ensureStageUpdate(
                stage,
                "failed",
                stage.output,
                "stage timed out"
              )
            : stage
        );
        status = "failed";
        await client.mutation(api.pipeline.UpdatePipelineJob, {
          jobId,
          stages: updatedStages,
          currentStage: inProgressIndex,
          status,
          error: "stage timed out",
        });
        return NextResponse.json({
          ok: true,
          jobId,
          status,
          stages: updatedStages,
          chunks: [],
        });
      }
    }

    const normalized = normalizeText(job.userInput || "");
    const paragraphs = splitToParagraphs(normalized);
    const contentIndex = buildContentIndex(paragraphs);
    const chunks = chunkParagraphs(paragraphs, { maxCharsPerChunk: 1800, overlap: 1 });

    let structurePlan = null;
    let layoutPlan = null;
    let assetPlan = null;
    const cachedStructure = stages.find((stage) => stage.id === "sitemap")?.output;
    const cachedLayout = stages.find((stage) => stage.id === "layout_plan")?.output;
    const cachedAsset = stages.find((stage) => stage.id === "image_plan")?.output;

    if (cachedStructure) structurePlan = cachedStructure.structurePlan || cachedStructure;
    if (cachedLayout) layoutPlan = cachedLayout.layoutPlan || cachedLayout;
    if (cachedAsset) assetPlan = cachedAsset.assetPlan || cachedAsset;

    if (nextIndex !== -1 && status === "running") {
      const stage = stages[nextIndex];
      updatedStages = stages.map((s, idx) =>
        idx === nextIndex ? ensureStageUpdate(s, "in_progress", s.output, null) : s
      );
      await client.mutation(api.pipeline.UpdatePipelineJob, {
        jobId,
        stages: updatedStages,
        currentStage: nextIndex,
        status: "running",
        error: null,
      });

      try {
        if (stage.id === "sitemap" && !structurePlan) {
          const structurePrompt = renderTemplate(Prompt.STRUCTURE_PLAN_PROMPT, {
            USER_INPUT: normalized.slice(0, 20000),
          });
          const sitemapPrompt = renderTemplate(Prompt.SITEMAP_PROMPT, {
            USER_INPUT: normalized.slice(0, 12000),
          });
          const [structureRes, sitemapRes] = await Promise.all([
            withTimeout(structurePlanSession.sendMessage(structurePrompt), 25000),
            withTimeout(structurePlanSession.sendMessage(sitemapPrompt), 20000),
          ]);
          const structureText = structureRes?.response?.text?.() || "";
          const sitemapText = sitemapRes?.response?.text?.() || "";
          structurePlan = safeJsonParse(extractJson(structureText) || "") || {
            site_title: "内容展示",
            sections: [],
          };
          const sitemap = safeJsonParse(extractJson(sitemapText) || "") || { sections: [] };
          const stageOutput = { sitemap, structurePlan };
          updatedStages = updatedStages.map((s, idx) =>
            idx === nextIndex ? ensureStageUpdate(s, "done", stageOutput, null) : s
          );
          await client.mutation(api.pipeline.UpdatePipelineJob, {
            jobId,
            stages: updatedStages,
            currentStage: nextIndex,
            status: "running",
            error: null,
          });
          return NextResponse.json({
            ok: true,
            jobId,
            status: "running",
            stages: updatedStages,
            chunks: chunks.map((chunk) => ({
              chunk_id: chunk.chunk_id,
              start_idx: chunk.start_idx,
              end_idx: chunk.end_idx,
              char_count: chunk.char_count,
            })),
          });
        }

        if (stage.id === "layout_plan" && !layoutPlan) {
          const layoutPrompt = renderTemplate(Prompt.LAYOUT_PLAN_PROMPT, {
            STRUCTURE_PLAN: JSON.stringify(structurePlan || {}),
          });
          const layoutRes = await withTimeout(
            layoutPlanSession.sendMessage(layoutPrompt),
            25000
          );
          const text = layoutRes?.response?.text?.() || "";
          layoutPlan = safeJsonParse(extractJson(text) || "") || { sections: [] };
        }

        if (stage.id === "image_plan" && !assetPlan) {
          const assetPrompt = renderTemplate(Prompt.ASSET_PLAN_PROMPT, {
            STRUCTURE_PLAN: JSON.stringify(structurePlan || {}),
            LAYOUT_PLAN: JSON.stringify(layoutPlan || {}),
          });
          const assetRes = await withTimeout(
            assetPlanSession.sendMessage(assetPrompt),
            25000
          );
          const text = assetRes?.response?.text?.() || "";
          assetPlan = safeJsonParse(extractJson(text) || "") || {
            images: [],
            videos: [],
            books: [],
          };
        }

        const stageOutput = await runStage(stage.id, {
          userInput: normalized,
          paragraphs,
          contentIndex,
          structurePlan: structurePlan || { site_title: "内容展示", sections: [] },
          layoutPlan: layoutPlan || { sections: [] },
        });

        updatedStages = updatedStages.map((s, idx) =>
          idx === nextIndex ? ensureStageUpdate(s, "done", stageOutput, null) : s
        );

        if (stage.id === "codegen_assemble") {
          const payload = await buildPipelinePayload(
            { paragraphs, contentIndex, structurePlan, layoutPlan },
            assetPlan || { images: [], videos: [], books: [] },
            layoutPlan || { sections: [] }
          );
          await client.mutation(api.workspace.UpdateFiles, {
            workspaceId: job.workspaceId,
            files: payload.files,
            sitePayload: payload.sitePayload,
          });
          await client.mutation(api.workspace.UpdateImages, {
            workspaceId: job.workspaceId,
            imagePrompts: payload.imagePrompts,
            imageMap: {},
            imageFailures: [],
          });
          updatedStages = updatedStages.map((s) =>
            s.id === stage.id
              ? ensureStageUpdate(
                  s,
                  "done",
                  { ...stageOutput, files: Object.keys(payload.files) },
                  null
                )
              : s
          );
          status = "done";
        }

        await client.mutation(api.pipeline.UpdatePipelineJob, {
          jobId,
          stages: updatedStages,
          currentStage: nextIndex,
          status,
          error: null,
        });
      } catch (err) {
        updatedStages = updatedStages.map((s, idx) =>
          idx === nextIndex ? ensureStageUpdate(s, "failed", s.output, err?.message) : s
        );
        await client.mutation(api.pipeline.UpdatePipelineJob, {
          jobId,
          stages: updatedStages,
          currentStage: nextIndex,
          status: "failed",
          error: err?.message,
        });
        status = "failed";
      }
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status,
      stages: updatedStages,
      chunks: chunks.map((chunk) => ({
        chunk_id: chunk.chunk_id,
        start_idx: chunk.start_idx,
        end_idx: chunk.end_idx,
        char_count: chunk.char_count,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err?.message || "Pipeline status error",
    });
  }
}
