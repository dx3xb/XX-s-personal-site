import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

type TokenRow = {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

function generateToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = String(searchParams.get("project_id") ?? "").trim();

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id" },
        { status: 400 }
      );
    }

    const rows = await query<TokenRow>(
      `select id, token, created_at, expires_at, revoked_at
       from public.preview_tokens
       where project_id = $1
       order by created_at desc`,
      [projectId]
    );

    return NextResponse.json({ ok: true, tokens: rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load tokens" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = String(body?.project_id ?? "").trim();
    const expiresAt = body?.expires_at ? String(body.expires_at) : null;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id" },
        { status: 400 }
      );
    }

    const token = generateToken();

    const rows = await query<TokenRow>(
      `insert into public.preview_tokens (project_id, token, expires_at)
       values ($1, $2, $3)
       returning id, token, created_at, expires_at, revoked_at`,
      [projectId, token, expiresAt]
    );

    return NextResponse.json({ ok: true, token: rows[0] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create token" },
      { status: 500 }
    );
  }
}
