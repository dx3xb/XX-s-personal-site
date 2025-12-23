import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = String(id ?? "").trim();

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 }
      );
    }

    await query(`delete from public.images where project_id = $1`, [projectId]);
    await query(`delete from public.conversations where project_id = $1`, [projectId]);
    await query(`delete from public.preview_tokens where project_id = $1`, [projectId]);
    await query(`delete from public.projects where id = $1`, [projectId]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to delete project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = String(id ?? "").trim();
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body?.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(String(body.title).trim());
    }
    if (body?.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(String(body.description).trim());
    }
    if (body?.user_prompt !== undefined) {
      fields.push(`user_prompt = $${idx++}`);
      values.push(String(body.user_prompt).trim());
    }
    if (body?.generated_html !== undefined) {
      fields.push(`generated_html = $${idx++}`);
      values.push(String(body.generated_html));
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(projectId);
    await query(
      `update public.projects
       set ${fields.join(", ")}
       where id = $${idx}`,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to update project" },
      { status: 500 }
    );
  }
}
