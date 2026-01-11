import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerationRow = {
  id: string;
  audio_data: Buffer;
  file_name: string | null;
  text_content: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await query<GenerationRow>(
      `select id, audio_data, file_name, text_content
       from public.voicemaker_generations
       where id = $1
       limit 1`,
      [id]
    );

    const record = rows[0];
    if (!record || !record.audio_data) {
      return NextResponse.json(
        { ok: false, error: "记录不存在或音频数据已删除" },
        { status: 404 }
      );
    }

    const fileName = record.file_name || `voice_${id}.mp3`;
    const audioBuffer = Buffer.from(record.audio_data);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(audioBuffer.length),
      },
    });
  } catch (err: any) {
    console.error("[Voicemaker] 下载失败:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "下载失败" },
      { status: 500 }
    );
  }
}
