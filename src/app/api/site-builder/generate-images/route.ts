import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type ImageRow = {
  id: string;
  slot_id: string | null;
  section?: string | null;
  usage: string;
  prompt: string;
  negative_prompt: string | null;
  style: string | null;
  aspect_ratio: string | null;
  size: string | null;
  seed: number | null;
  image_url: string | null;
};

function createPlaceholderDataUrl(usage: string, prompt: string) {
  const text = `${usage}\n${prompt.slice(0, 80)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="640"><rect width="100%" height="100%" fill="#0b0f1f"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#e2e8f0" font-family="Arial" font-size="24">${text}</text></svg>`;
  const encoded = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

function normalizeArkSize(size?: string | null, aspectRatio?: string | null) {
  const raw = (size || "").trim();
  if (!raw) {
    return aspectRatio?.includes("16:9") ? "1280x720" : "1024x1024";
  }
  if (/^\d+x\d+$/i.test(raw)) {
    const [w, h] = raw.split("x").map((v) => Number(v));
    if (Number.isFinite(w) && Number.isFinite(h)) {
      const area = w * h;
      if (area < 921600) {
        return aspectRatio?.includes("16:9") ? "1280x720" : "1024x1024";
      }
    }
  }
  return raw;
}

async function generateImageUrl(
  prompt: string,
  size?: string | null,
  seed?: number | null,
  aspectRatio?: string | null
) {
  const apiKey = process.env.ARK_API_KEY;
  const model = process.env.ARK_IMAGE_MODEL || "doubao-seedream-4-0-250828";
  const endpoint =
    process.env.ARK_IMAGE_ENDPOINT ||
    "https://ark.cn-beijing.volces.com/api/v3/images/generations";

  if (!apiKey) {
    throw new Error("ARK_API_KEY is not configured");
  }

  let response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      response_format: "url",
      size: normalizeArkSize(size, aspectRatio) || "2K",
      watermark: false,
      seed: seed ?? undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image API failed: ${errorText}`);
  }

  const data = await response.json();
  const url =
    data?.data?.[0]?.url ||
    data?.result?.data?.[0]?.url ||
    data?.result?.url ||
    data?.url ||
    data?.image_url;

  if (!url) {
    throw new Error("Image API returned no URL");
  }

  return url;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = String(body?.project_id ?? "").trim();
    const images = Array.isArray(body?.images) ? body.images : null;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id" },
        { status: 400 }
      );
    }

    const sourceImages =
      images?.filter((img: any) => img?.prompt) ??
      (await query<ImageRow>(
        `select id, slot_id, section, usage, prompt, negative_prompt, style, aspect_ratio, size, seed, image_url from public.images where project_id = $1`,
        [projectId]
      ));

    if (sourceImages.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No image prompts found" },
        { status: 400 }
      );
    }

    const results: ImageRow[] = [];
    for (const image of sourceImages) {
      const url = await generateImageUrl(
        image.prompt,
        image.size,
        image.seed,
        image.aspect_ratio
      );
      if (image.slot_id) {
        await query(
          `delete from public.images where project_id = $1 and slot_id = $2`,
          [projectId, image.slot_id]
        );
      }
      const rows = await query<ImageRow>(
        `insert into public.images (project_id, slot_id, section, usage, prompt, negative_prompt, style, aspect_ratio, size, seed, image_url)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id, slot_id, section, usage, prompt, negative_prompt, style, aspect_ratio, size, seed, image_url`,
        [
          projectId,
          image.slot_id ?? null,
          (image as any).section ?? null,
          image.usage,
          image.prompt,
          image.negative_prompt ?? null,
          image.style ?? null,
          image.aspect_ratio ?? null,
          image.size ?? null,
          image.seed ?? null,
          url,
        ]
      );
      results.push(rows[0]);
    }

    return NextResponse.json({ ok: true, images: results });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to generate images" },
      { status: 502 }
    );
  }
}
