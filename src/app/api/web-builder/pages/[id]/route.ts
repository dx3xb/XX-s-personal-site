import { NextResponse } from "next/server";
import { PageSchema } from "@/lib/web-builder/dsl";
import { deletePage, getPage, savePage } from "@/lib/web-builder/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const page = await getPage(params.id);
    if (!page) {
      return NextResponse.json(
        { ok: false, error: "Page not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to load page" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const page = body?.page;
    if (!page) {
      return NextResponse.json(
        { ok: false, error: "Missing page" },
        { status: 400 }
      );
    }
    const parsed = PageSchema.parse({ ...page, id: params.id });
    const saved = await savePage(parsed);
    return NextResponse.json({ ok: true, page: saved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to update page" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deletePage(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
