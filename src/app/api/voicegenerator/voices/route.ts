import { NextResponse } from "next/server";
import { fetchDoubaoVoiceList } from "@/lib/doubao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const voices = await fetchDoubaoVoiceList();
    return NextResponse.json({ ok: true, voices });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "获取音色列表失败" },
      { status: 500 }
    );
  }
}
