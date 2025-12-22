import { NextResponse } from "next/server";
import { createDefaultPage, PageSchema } from "@/lib/web-builder/dsl";
import { listPages, savePage } from "@/lib/web-builder/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pages = await listPages();
    return NextResponse.json({ ok: true, pages });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list pages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const page = body?.page ?? createDefaultPage();
    const parsed = PageSchema.parse(page);
    const saved = await savePage(parsed);
    return NextResponse.json({ ok: true, page: saved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to save page" },
      { status: 400 }
    );
  }
}
