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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const title =
      typeof body?.title === "string" ? body.title.trim() : undefined;
    const description =
      typeof body?.description === "string" ? body.description.trim() : undefined;
    const isFavorite =
      typeof body?.is_favorite === "boolean" ? body.is_favorite : undefined;

    const updates: string[] = [];
    const values: Array<string | boolean> = [];
    let idx = 1;

    if (title !== undefined) {
      if (!title) {
        return NextResponse.json(
          { ok: false, error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updates.push(`title = $${idx++}`);
      values.push(title);
    }

    if (description !== undefined) {
      if (!description) {
        return NextResponse.json(
          { ok: false, error: "Description cannot be empty" },
          { status: 400 }
        );
      }
      updates.push(`description = $${idx++}`);
      values.push(description);
    }

    if (isFavorite !== undefined) {
      updates.push(`is_favorite = $${idx++}`);
      values.push(isFavorite);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = now()");
    values.push(id);

    const rows = await query<AppRow>(
      `update public.apps
       set ${updates.join(", ")}
       where id = $${idx}
       returning id, slug, title, description, is_favorite, created_at, updated_at`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "App not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, app: rows[0] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to update app" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query<{ id: string }>(
      `delete from public.apps where id = $1 returning id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "App not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to delete app" },
      { status: 500 }
    );
  }
}
