import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type AppRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

const slugRegex = /^[a-z0-9-]+$/;

export async function GET() {
  try {
    const apps = await query<AppRow>(
      `select id, slug, title, description, is_favorite, created_at, updated_at
       from public.apps
       order by is_favorite desc, created_at desc`
    );
    return NextResponse.json({ ok: true, apps });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load apps" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = String(body?.slug ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();

    if (!slug || !title || !description) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { ok: false, error: "Slug must be lowercase letters, numbers, or dashes" },
        { status: 400 }
      );
    }

    const rows = await query<AppRow>(
      `insert into public.apps (slug, title, description, content, is_favorite)
       values ($1, $2, $3, '{}'::jsonb, false)
       returning id, slug, title, description, is_favorite, created_at, updated_at`,
      [slug, title, description]
    );

    return NextResponse.json({ ok: true, app: rows[0] }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Slug already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create app" },
      { status: 500 }
    );
  }
}
