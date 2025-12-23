import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = String(body?.project_id ?? "").trim();
    const password = String(body?.password ?? "");

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing project_id" },
        { status: 400 }
      );
    }
    if (password.length < 4) {
      return NextResponse.json(
        { ok: false, error: "密码至少 4 位" },
        { status: 400 }
      );
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);

    await query(
      `update public.projects
       set preview_password_hash = $1, preview_password_salt = $2
       where id = $3`,
      [hash, salt, projectId]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to set password" },
      { status: 500 }
    );
  }
}
