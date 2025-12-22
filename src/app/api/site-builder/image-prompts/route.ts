import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ImagePlanSchema } from "@/lib/site-builder/plan";

export const runtime = "nodejs";

type ProjectRow = {
  image_plan: unknown | null;
};

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
      `select image_plan from public.projects where id = $1`,
      [projectId]
    );
    const project = rows[0];
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 }
      );
    }

    let planRaw: unknown = project.image_plan;
    if (typeof planRaw === "string") {
      try {
        planRaw = JSON.parse(planRaw);
      } catch {
        planRaw = null;
      }
    }

    const validated = ImagePlanSchema.safeParse(planRaw);
    if (!validated.success || validated.data.images.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Image plan not found in project" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, images: validated.data.images });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load image prompts" },
      { status: 500 }
    );
  }
}
