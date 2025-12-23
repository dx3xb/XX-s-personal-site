import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  user_prompt: string;
  generated_html: string;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id")?.trim();
    const limit = Number(searchParams.get("limit") ?? "20");
    const capped = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

    if (projectId) {
      const rows = await query<ProjectRow>(
        `select id, title, description, user_prompt, generated_html, created_at
         from public.projects
         where id = $1`,
        [projectId]
      );
      return NextResponse.json({ ok: true, project: rows[0] ?? null });
    }

    const projects = await query<ProjectRow>(
      `select id, title, description, user_prompt, generated_html, created_at
       from public.projects
       order by created_at desc
       limit $1`,
      [capped]
    );

    return NextResponse.json({ ok: true, projects });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body?.user_prompt ?? "").trim();
    const title = String(body?.title ?? "Untitled Project").trim() || "Untitled Project";
    const description = String(body?.description ?? "").trim() || null;

    if (body?.user_prompt !== undefined && !prompt && !title && !description) {
      return NextResponse.json(
        { ok: false, error: "Missing user_prompt" },
        { status: 400 }
      );
    }

    const rows = await query<ProjectRow>(
      `insert into public.projects (title, description, user_prompt)
       values ($1, $2, $3)
       returning id, title, description, user_prompt, generated_html, created_at`,
      [title, description, prompt]
    );

    return NextResponse.json({ ok: true, project: rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create project" },
      { status: 500 }
    );
  }
}
