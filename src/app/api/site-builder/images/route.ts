import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type ImageRow = {
  id: string;
  project_id: string;
  slot_id: string | null;
  section: string | null;
  usage: string;
  prompt: string;
  negative_prompt: string | null;
  style: string | null;
  aspect_ratio: string | null;
  size: string | null;
  seed: number | null;
  image_url: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id")?.trim();

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id" },
        { status: 400 }
      );
    }

    const images = await query<ImageRow>(
      `select id, project_id, slot_id, section, usage, prompt, negative_prompt, style, aspect_ratio, size, seed, image_url, created_at
       from public.images
       where project_id = $1
       order by created_at asc`,
      [projectId]
    );

    return NextResponse.json({ ok: true, images });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load images" },
      { status: 500 }
    );
  }
}
