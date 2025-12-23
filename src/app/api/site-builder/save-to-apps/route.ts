import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const MAX_HTML_LENGTH = 200_000;

type AppRow = {
  id: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = String(body?.project_id ?? "").trim();
    let html = String(body?.html ?? "").trim();
    const title = String(body?.title ?? "Site Builder").trim() || "Site Builder";

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id" },
        { status: 400 }
      );
    }

    if (!html) {
      const rows = await query<{ generated_html: string }>(
        `select generated_html from public.projects where id = $1`,
        [projectId]
      );
      html = rows[0]?.generated_html ?? "";
    }

    if (!html) {
      return NextResponse.json(
        { ok: false, error: "Missing html content" },
        { status: 400 }
      );
    }

    if (html.length > MAX_HTML_LENGTH) {
      return NextResponse.json(
        { ok: false, error: "HTML is too large" },
        { status: 413 }
      );
    }

    const images = await query<{ usage: string; image_url: string | null; slot_id: string | null }>(
      `select usage, image_url, slot_id from public.images where project_id = $1`,
      [projectId]
    );

    const content = {
      type: "site-builder",
      activeProjectId: projectId,
      latestHtml: html,
      images,
      updatedAt: new Date().toISOString(),
    };

    const rows = await query<AppRow>(
      `insert into public.apps (slug, title, description, content, is_favorite)
       values ($1, $2, $3, $4::jsonb, false)
       on conflict (slug)
       do update set content = excluded.content, updated_at = now()
       returning id`,
      [
        "site-builder",
        title,
        "Natural language → Web page",
        JSON.stringify(content),
      ]
    );

    return NextResponse.json({ ok: true, appId: rows[0]?.id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to save app content" },
      { status: 500 }
    );
  }
}
