import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_ACCESS_TOKEN = process.env.DOUBAO_ACCESS_TOKEN;
const DOUBAO_APP_ID = process.env.DOUBAO_APP_ID;
const DOUBAO_VOICE_MODEL_TYPE = Number(process.env.DOUBAO_VOICE_MODEL_TYPE || "2");
const DOUBAO_VOICE_LANGUAGE = process.env.DOUBAO_VOICE_LANGUAGE;
const DOUBAO_VOICE_EXTRA_PARAMS = process.env.DOUBAO_VOICE_EXTRA_PARAMS;
const DOUBAO_VOICE_RESOURCE_ID = process.env.DOUBAO_VOICE_RESOURCE_ID;
// 豆包声音复刻上传 API 端点
const DOUBAO_VOICE_CLONE_URL =
  process.env.DOUBAO_VOICE_CLONE_URL || "https://openspeech.bytedance.com/api/v1/mega_tts/audio/upload";

/**
 * 创建自定义音色（声音复刻）
 * 需要上传音频样本（至少5秒），豆包会训练并返回音色ID
 */
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

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const audioFile = formData.get("audio") as File | null;
    const speakerId = String(formData.get("speaker_id") ?? "").trim();
    const languageRaw = String(formData.get("language") ?? "").trim();

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

    if (!speakerId) {
      return NextResponse.json(
        { ok: false, error: "请填写 SpeakerID" },
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
    };

    if (DOUBAO_API_KEY) {
      headers["x-api-key"] = DOUBAO_API_KEY;
    }

    if (DOUBAO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer; ${DOUBAO_ACCESS_TOKEN}`;
    }

    const resourceId =
      DOUBAO_VOICE_RESOURCE_ID || (DOUBAO_VOICE_MODEL_TYPE === 4 ? "seed-icl-2.0" : "seed-icl-1.0");
    if (resourceId) {
      headers["Resource-Id"] = resourceId;
    }

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      appid: DOUBAO_APP_ID,
      speaker_id: speakerId,
      audios: [
        {
          audio_bytes: audioBase64,
          audio_format: audioFile.type.includes("wav") ? "wav" : "mp3",
        },
      ],
      source: 2,
      model_type: Number.isNaN(DOUBAO_VOICE_MODEL_TYPE) ? 2 : DOUBAO_VOICE_MODEL_TYPE,
    };

    const languageSource = languageRaw || DOUBAO_VOICE_LANGUAGE || "";
    if (languageSource) {
      const languageValue = Number.parseInt(languageSource, 10);
      if (!Number.isNaN(languageValue)) {
        requestBody.language = languageValue;
      }
    }

    if (DOUBAO_VOICE_EXTRA_PARAMS) {
      requestBody.extra_params = DOUBAO_VOICE_EXTRA_PARAMS;
    }

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

    if (data?.BaseResp?.StatusCode !== 0) {
      const message = data?.BaseResp?.StatusMessage || "声音复刻上传失败";
      return NextResponse.json(
        { ok: false, error: message },
        { status: 500 }
      );
    }

    // 豆包返回的音色ID
    const voiceId = data?.speaker_id || data?.SpeakerID;

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
