import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

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

    const projectRows = await query<{
      id: string;
      title: string;
      page_plan: unknown | null;
      image_plan: unknown | null;
    }>(
      `select id, title, page_plan, image_plan from public.projects where id = $1`,
      [projectId]
    );

    if (!projectRows[0]) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const images = await query<{
      id: string;
      slot_id: string | null;
      section: string | null;
      usage: string;
      prompt: string;
      image_url: string | null;
      created_at: string;
    }>(
      `select id, slot_id, section, usage, prompt, image_url, created_at
       from public.images
       where project_id = $1
       order by created_at asc`,
      [projectId]
    );

    return NextResponse.json({
      ok: true,
      project: projectRows[0],
      images,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load image plan" },
      { status: 500 }
    );
  }
}
