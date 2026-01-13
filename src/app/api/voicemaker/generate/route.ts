import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fetchDoubaoVoiceList } from "@/lib/doubao";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_ACCESS_TOKEN = process.env.DOUBAO_ACCESS_TOKEN;
const DOUBAO_APP_ID = process.env.DOUBAO_APP_ID;
const DOUBAO_APP_TOKEN = process.env.DOUBAO_APP_TOKEN || DOUBAO_ACCESS_TOKEN || "token";
const DOUBAO_CLUSTER = process.env.DOUBAO_CLUSTER || "volcano_icl";
const DOUBAO_USER_UID = process.env.DOUBAO_USER_UID || "doubao";
const DOUBAO_RESOURCE_ID = process.env.DOUBAO_RESOURCE_ID;
const DOUBAO_EXPLICIT_LANGUAGE = process.env.DOUBAO_EXPLICIT_LANGUAGE;
// 豆包 TTS API 端点（根据实际 API 文档调整）
const DOUBAO_TTS_URL = process.env.DOUBAO_TTS_URL || "https://openspeech.bytedance.com/api/v1/tts";

const getBase64Audio = (data: any) => {
  const candidates = [
    data?.audio,
    data?.audio_data,
    data?.data,
    data?.data?.audio,
    data?.data?.audio_data,
    data?.data?.data,
    data?.result?.audio,
    data?.result?.audio_data,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
};

const normalizeBase64 = (value: string) => {
  const trimmed = value.trim();
  const marker = "base64,";
  const index = trimmed.indexOf(marker);
  if (index === -1) {
    return trimmed;
  }
  return trimmed.slice(index + marker.length);
};

export async function POST(request: Request) {
  try {
    if (!DOUBAO_API_KEY && !DOUBAO_ACCESS_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "DOUBAO_API_KEY / DOUBAO_ACCESS_TOKEN 未配置" },
        { status: 500 }
      );
    }

    if (!DOUBAO_APP_ID) {
      return NextResponse.json(
        { ok: false, error: "DOUBAO_APP_ID 未配置" },
        { status: 500 }
      );
    }

    // DOUBAO_RESOURCE_ID 是可选的，根据实际 API 要求配置

    const body = await request.json();
    const text = String(body?.text ?? "").trim();
    const voiceId = String(body?.voice_id ?? "").trim();

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

    if (!voiceId) {
      return NextResponse.json(
        { ok: false, error: "音色不能为空" },
        { status: 400 }
      );
    }

    try {
      const voices = await fetchDoubaoVoiceList();
      if (voices.length > 0 && !voices.some((voice) => voice.id === voiceId)) {
        return NextResponse.json(
          { ok: false, error: "无效的音色ID" },
          { status: 400 }
        );
      }
    } catch (err) {
      console.warn("[Voicemaker] 获取音色列表失败，跳过校验:", err);
    }

    console.log(`[Voicemaker] 生成语音: text="${text.substring(0, 50)}...", voice="${voiceId}"`);

    // 调用豆包 TTS API
    // 注意：根据豆包官方文档，实际参数格式可能需要调整
    // 参考文档：https://www.volcengine.com/docs/6561/79821
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (DOUBAO_API_KEY) {
      headers["x-api-key"] = DOUBAO_API_KEY;
    }

    if (DOUBAO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${DOUBAO_ACCESS_TOKEN}`;
    }
    
    if (DOUBAO_RESOURCE_ID) {
      headers["Resource-Id"] = DOUBAO_RESOURCE_ID;
    }

    const response = await fetch(DOUBAO_TTS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        app: {
          appid: DOUBAO_APP_ID || undefined,
          token: DOUBAO_APP_TOKEN,
          cluster: DOUBAO_CLUSTER,
        },
        user: {
          uid: DOUBAO_USER_UID,
        },
        audio: {
          voice_type: voiceId,
          encoding: "mp3",
          speed_ratio: 1.0,
          explicit_language: DOUBAO_EXPLICIT_LANGUAGE || undefined,
        },
        request: {
          reqid: randomUUID(),
          text: text,
          operation: "query",
        },
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
    const contentType = response.headers.get("content-type") || "";
    let audioData: Buffer;

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (typeof payload?.code === "number" && payload.code !== 3000) {
        return NextResponse.json(
          { ok: false, error: payload?.message || "TTS API 返回错误" },
          { status: 500 }
        );
      }
      const base64Audio = getBase64Audio(payload);
      if (!base64Audio) {
        console.error("[Voicemaker] 音频数据缺失:", payload);
        return NextResponse.json(
          { ok: false, error: "TTS API 返回缺少音频数据" },
          { status: 500 }
        );
      }
      audioData = Buffer.from(normalizeBase64(base64Audio), "base64");
    } else {
      const audioBuffer = await response.arrayBuffer();
      audioData = Buffer.from(audioBuffer);
    }

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
