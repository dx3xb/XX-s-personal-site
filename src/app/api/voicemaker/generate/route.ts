import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_RESOURCE_ID = process.env.DOUBAO_RESOURCE_ID;
// 豆包 TTS API 端点（根据实际 API 文档调整）
const DOUBAO_TTS_URL = process.env.DOUBAO_TTS_URL || "https://openspeech.bytedance.com/api/v1/tts";

// 豆包支持的音色列表
export const VOICE_OPTIONS = [
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓（女声）", gender: "female" },
  { id: "zh-CN-YunxiNeural", name: "云希（男声）", gender: "male" },
  { id: "zh-CN-YunyangNeural", name: "云扬（男声）", gender: "male" },
  { id: "zh-CN-XiaoyiNeural", name: "晓伊（女声）", gender: "female" },
  { id: "zh-CN-YunjianNeural", name: "云健（男声）", gender: "male" },
  { id: "zh-CN-XiaochenNeural", name: "晓辰（女声）", gender: "female" },
  { id: "zh-CN-XiaohanNeural", name: "晓涵（女声）", gender: "female" },
  { id: "zh-CN-XiaomengNeural", name: "晓梦（女声）", gender: "female" },
  { id: "zh-CN-XiaomoNeural", name: "晓墨（女声）", gender: "female" },
  { id: "zh-CN-XiaoqiuNeural", name: "晓秋（女声）", gender: "female" },
  { id: "zh-CN-XiaoruiNeural", name: "晓睿（女声）", gender: "female" },
  { id: "zh-CN-XiaoshuangNeural", name: "晓双（女声）", gender: "female" },
  { id: "zh-CN-XiaoxuanNeural", name: "晓萱（女声）", gender: "female" },
  { id: "zh-CN-XiaoyanNeural", name: "晓颜（女声）", gender: "female" },
  { id: "zh-CN-XiaoyouNeural", name: "晓悠（女声）", gender: "female" },
  { id: "zh-CN-XiaozhenNeural", name: "晓甄（女声）", gender: "female" },
];

export async function POST(request: Request) {
  try {
    if (!DOUBAO_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "DOUBAO_API_KEY 未配置" },
        { status: 500 }
      );
    }

    // DOUBAO_RESOURCE_ID 是可选的，根据实际 API 要求配置

    const body = await request.json();
    const text = String(body?.text ?? "").trim();
    const voiceId = String(body?.voice_id ?? "zh-CN-XiaoxiaoNeural").trim();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "文本内容不能为空" },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "文本内容不能超过2000个字符" },
        { status: 400 }
      );
    }

    // 验证音色是否有效（标准音色或自定义音色）
    const isValidStandardVoice = VOICE_OPTIONS.some((v) => v.id === voiceId);
    
    // 检查是否是自定义音色
    let isCustomVoice = false;
    if (!isValidStandardVoice) {
      const customVoices = await query<{ voice_id: string; status: string }>(
        `select voice_id, status
         from public.voicemaker_custom_voices
         where voice_id = $1
         limit 1`,
        [voiceId]
      );
      
      if (customVoices.length > 0) {
        isCustomVoice = true;
        if (customVoices[0].status !== "ready") {
          return NextResponse.json(
            { ok: false, error: `自定义音色尚未就绪，当前状态: ${customVoices[0].status}` },
            { status: 400 }
          );
        }
      }
    }
    
    if (!isValidStandardVoice && !isCustomVoice) {
      return NextResponse.json(
        { ok: false, error: "无效的音色ID" },
        { status: 400 }
      );
    }

    console.log(`[Voicemaker] 生成语音: text="${text.substring(0, 50)}...", voice="${voiceId}"`);

    // 调用豆包 TTS API
    // 注意：根据豆包官方文档，实际参数格式可能需要调整
    // 参考文档：https://www.volcengine.com/docs/6561/79821
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DOUBAO_API_KEY}`,
    };
    
    if (DOUBAO_RESOURCE_ID) {
      headers["Resource-Id"] = DOUBAO_RESOURCE_ID;
    }

    const response = await fetch(DOUBAO_TTS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: text,
        voice: voiceId,
        format: "mp3",
        speed: 1.0,
        volume: 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Voicemaker] API 错误:", errorText);
      return NextResponse.json(
        { ok: false, error: `TTS API 错误: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    // 获取音频数据
    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer);

    // 生成文件名
    const timestamp = Date.now();
    const fileName = `voice_${timestamp}.mp3`;

    // 保存到数据库
    const rows = await query<{
      id: string;
      text_content: string;
      voice_id: string;
      audio_url: string | null;
      file_name: string | null;
      file_size: number | null;
      created_at: string;
    }>(
      `insert into public.voicemaker_generations 
       (text_content, voice_id, audio_data, file_name, file_size)
       values ($1, $2, $3, $4, $5)
       returning id, text_content, voice_id, audio_url, file_name, file_size, created_at`,
      [text, voiceId, audioData, fileName, audioData.length]
    );

    const record = rows[0];

    // 返回音频数据（base64 编码）和记录ID
    const audioBase64 = audioData.toString("base64");
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

    return NextResponse.json({
      ok: true,
      id: record.id,
      audio_url: audioUrl,
      file_name: fileName,
      file_size: audioData.length,
      created_at: record.created_at,
    });
  } catch (err: any) {
    console.error("[Voicemaker] 生成失败:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "生成语音失败" },
      { status: 500 }
    );
  }
}

// 获取生成记录列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "20");
    const capped = Math.min(Math.max(limit, 1), 50);

    const rows = await query<{
      id: string;
      text_content: string;
      voice_id: string;
      file_name: string | null;
      file_size: number | null;
      created_at: string;
    }>(
      `select id, text_content, voice_id, file_name, file_size, created_at
       from public.voicemaker_generations
       order by created_at desc
       limit $1`,
      [capped]
    );

    return NextResponse.json({ ok: true, records: rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "获取记录失败" },
      { status: 500 }
    );
  }
}
