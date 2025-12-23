import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type ConversationRow = {
  id: string;
  project_id: string;
  role: string;
  content: string;
  created_at: string;
};

const allowedRoles = new Set(["user", "builder", "image_agent"]);

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

    const conversations = await query<ConversationRow>(
      `select id, project_id, role, content, created_at
       from public.conversations
       where project_id = $1
       order by created_at asc`,
      [projectId]
    );

    return NextResponse.json({ ok: true, conversations });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load conversations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = String(body?.project_id ?? "").trim();
    const role = String(body?.role ?? "").trim();
    const content = String(body?.content ?? "").trim();

    if (!projectId || !role || !content) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!allowedRoles.has(role)) {
      return NextResponse.json(
        { ok: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    const rows = await query<ConversationRow>(
      `insert into public.conversations (project_id, role, content)
       values ($1, $2, $3)
       returning id, project_id, role, content, created_at`,
      [projectId, role, content]
    );

    return NextResponse.json({ ok: true, conversation: rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create conversation" },
      { status: 500 }
    );
  }
}
