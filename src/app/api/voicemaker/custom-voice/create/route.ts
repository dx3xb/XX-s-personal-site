import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_APP_ID = process.env.DOUBAO_APP_ID;
// 豆包声音复刻 API 端点
const DOUBAO_VOICE_CLONE_URL = process.env.DOUBAO_VOICE_CLONE_URL || "https://openspeech.bytedance.com/api/v1/voice/clone";

/**
 * 创建自定义音色（声音复刻）
 * 需要上传音频样本（至少5秒），豆包会训练并返回音色ID
 */
export async function POST(request: Request) {
  try {
    if (!DOUBAO_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "DOUBAO_API_KEY 未配置" },
        { status: 500 }
      );
    }

    if (!DOUBAO_APP_ID) {
      return NextResponse.json(
        { ok: false, error: "DOUBAO_APP_ID 未配置" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const audioFile = formData.get("audio") as File | null;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "音色名称不能为空" },
        { status: 400 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: "请上传音频文件" },
        { status: 400 }
      );
    }

    // 验证音频文件
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { ok: false, error: "不支持的音频格式，请上传 MP3 或 WAV 文件" },
        { status: 400 }
      );
    }

    // 读取音频文件
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    console.log(`[Voicemaker] 创建自定义音色: name="${name}", file_size=${audioBuffer.length}`);

    // 调用豆包声音复刻 API
    // 根据文档：https://www.volcengine.com/docs/6561/1305191
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DOUBAO_API_KEY}`,
    };

    if (DOUBAO_APP_ID) {
      headers["X-App-Id"] = DOUBAO_APP_ID;
    }

    // 构建请求体
    const requestBody = {
      name: name,
      description: description || undefined,
      audio_data: audioBase64,
      audio_format: audioFile.type.includes("wav") ? "wav" : "mp3",
    };

    const response = await fetch(DOUBAO_VOICE_CLONE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Voicemaker] 声音复刻 API 错误:", errorText);
      return NextResponse.json(
        { ok: false, error: `声音复刻 API 错误: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 豆包返回的音色ID
    const voiceId = data.voice_id || data.id || data.voiceId;
    
    if (!voiceId) {
      console.error("[Voicemaker] API 返回格式异常:", data);
      return NextResponse.json(
        { ok: false, error: "API 返回格式异常，未找到音色ID" },
        { status: 500 }
      );
    }

    // 保存到数据库
    const rows = await query<{
      id: string;
      name: string;
      voice_id: string;
      status: string;
      created_at: string;
    }>(
      `insert into public.voicemaker_custom_voices 
       (name, description, voice_id, audio_sample_data, status)
       values ($1, $2, $3, $4, 'training')
       returning id, name, voice_id, status, created_at`,
      [name, description || null, voiceId, audioBuffer]
    );

    const record = rows[0];

    return NextResponse.json({
      ok: true,
      id: record.id,
      voice_id: voiceId,
      name: record.name,
      status: record.status,
      created_at: record.created_at,
      message: "音色创建成功，正在训练中，请稍后使用",
    });
  } catch (err: any) {
    console.error("[Voicemaker] 创建自定义音色失败:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "创建自定义音色失败" },
      { status: 500 }
    );
  }
}

// 获取自定义音色列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 可选：过滤状态

    let queryText = `select id, name, description, voice_id, status, created_at, updated_at
       from public.voicemaker_custom_voices`;
    const params: any[] = [];

    if (status) {
      queryText += ` where status = $1`;
      params.push(status);
    }

    queryText += ` order by created_at desc`;

    const rows = await query<{
      id: string;
      name: string;
      description: string | null;
      voice_id: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>(queryText, params);

    return NextResponse.json({ ok: true, voices: rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "获取自定义音色列表失败" },
      { status: 500 }
    );
  }
}
