import { createHash, createHmac } from "crypto";

export type DoubaoVoice = {
  id: string;
  name: string;
};

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_ACCESS_TOKEN = process.env.DOUBAO_ACCESS_TOKEN;
const DOUBAO_ACCESS_KEY_ID = process.env.DOUBAO_ACCESS_KEY_ID;
const DOUBAO_SECRET_ACCESS_KEY = process.env.DOUBAO_SECRET_ACCESS_KEY;
const DOUBAO_APP_ID = process.env.DOUBAO_APP_ID;
const DOUBAO_CLUSTER = process.env.DOUBAO_CLUSTER || "volcano_icl";
const DOUBAO_USER_UID = process.env.DOUBAO_USER_UID || "doubao";
const DOUBAO_RESOURCE_ID = process.env.DOUBAO_RESOURCE_ID;
const DOUBAO_OPENAPI_HOST = process.env.DOUBAO_OPENAPI_HOST || "open.volcengineapi.com";
const DOUBAO_OPENAPI_REGION = process.env.DOUBAO_OPENAPI_REGION || "cn-north-1";
const DOUBAO_OPENAPI_SERVICE = process.env.DOUBAO_OPENAPI_SERVICE || "speech_saas_prod";
const DOUBAO_OPENAPI_VERSION = process.env.DOUBAO_OPENAPI_VERSION || "2023-11-07";
const DOUBAO_VOICE_LIST_ACTION =
  process.env.DOUBAO_VOICE_LIST_ACTION || "ListMegaTTSTrainStatus";
const DOUBAO_SIGNING_KEY_PREFIX = process.env.DOUBAO_SIGNING_KEY_PREFIX || "VOLC4";
const DOUBAO_VOICE_STATE = process.env.DOUBAO_VOICE_STATE;
const DOUBAO_VOICE_RESOURCE_IDS = process.env.DOUBAO_VOICE_RESOURCE_IDS;
const DOUBAO_VOICE_LIST_URL =
  process.env.DOUBAO_VOICE_LIST_URL || "https://openspeech.bytedance.com/api/v1/voice/list";
const DOUBAO_VOICE_LIST_METHOD =
  (process.env.DOUBAO_VOICE_LIST_METHOD || "GET").toUpperCase() === "POST" ? "POST" : "GET";

const toCleanString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    const cleaned = toCleanString(value);
    if (cleaned) return cleaned;
  }
  return null;
};

const extractVoiceItems = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.voices)) return data.voices;
  if (Array.isArray(data?.data?.voices)) return data.data.voices;
  if (Array.isArray(data?.data?.list)) return data.data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result?.voices)) return data.result.voices;
  return [];
};

const normalizeVoices = (data: any) => {
  const items = extractVoiceItems(data);
  const voices: DoubaoVoice[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (typeof item === "string") {
      if (!seen.has(item)) {
        voices.push({ id: item, name: item });
        seen.add(item);
      }
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const id =
      pickFirstString(
        (item as any).voice_id,
        (item as any).voiceId,
        (item as any).id,
        (item as any).voice,
        (item as any).voiceID
      ) ?? null;
    if (!id || seen.has(id)) continue;

    const name =
      pickFirstString(
        (item as any).name,
        (item as any).voice_name,
        (item as any).voiceName,
        (item as any).display_name,
        (item as any).displayName,
        (item as any).title,
        (item as any).label
      ) ?? id;

    voices.push({ id, name });
    seen.add(id);
  }

  const defaultVoiceId = pickFirstString(
    data?.default_voice_id,
    data?.defaultVoiceId,
    data?.default_voice,
    data?.defaultVoice,
    data?.data?.default_voice_id,
    data?.data?.defaultVoiceId,
    data?.data?.default_voice,
    data?.data?.defaultVoice
  );

  const defaultVoiceName = pickFirstString(
    data?.default_voice_name,
    data?.defaultVoiceName,
    data?.data?.default_voice_name,
    data?.data?.defaultVoiceName
  );

  if (defaultVoiceId) {
    const existingIndex = voices.findIndex((voice) => voice.id === defaultVoiceId);
    const defaultVoice = {
      id: defaultVoiceId,
      name: defaultVoiceName ?? defaultVoiceId,
    };

    if (existingIndex === -1) {
      voices.unshift(defaultVoice);
    } else {
      const [voice] = voices.splice(existingIndex, 1);
      voices.unshift({
        id: voice.id,
        name: defaultVoiceName ?? voice.name,
      });
    }
  }

  return voices;
};

const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

const hmacSha256 = (key: Buffer | string, value: string) =>
  createHmac("sha256", key).update(value).digest();

const hmacSha256Hex = (key: Buffer | string, value: string) =>
  createHmac("sha256", key).update(value).digest("hex");

const toAmzDate = (date: Date) => date.toISOString().replace(/[:-]|\.\d{3}/g, "");

const buildCanonicalQuery = (params: Record<string, string>) => {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
};

const buildCanonicalHeaders = (headers: Record<string, string>) => {
  const entries = Object.entries(headers).map(([key, value]) => [
    key.toLowerCase(),
    value.trim().replace(/\s+/g, " "),
  ]);
  entries.sort(([a], [b]) => a.localeCompare(b));
  const canonical = entries.map(([key, value]) => `${key}:${value}`).join("\n");
  const signed = entries.map(([key]) => key).join(";");
  return { canonical: `${canonical}\n`, signed };
};

const buildSigningKey = (secret: string, dateStamp: string) => {
  const prefix = DOUBAO_SIGNING_KEY_PREFIX ?? "";
  const kDate = hmacSha256(`${prefix}${secret}`, dateStamp);
  const kRegion = hmacSha256(kDate, DOUBAO_OPENAPI_REGION);
  const kService = hmacSha256(kRegion, DOUBAO_OPENAPI_SERVICE);
  return hmacSha256(kService, "request");
};

const fetchVolcengineVoiceList = async () => {
  if (!DOUBAO_ACCESS_KEY_ID || !DOUBAO_SECRET_ACCESS_KEY) {
    throw new Error("DOUBAO_ACCESS_KEY_ID / DOUBAO_SECRET_ACCESS_KEY 未配置");
  }

  if (!DOUBAO_APP_ID) {
    throw new Error("DOUBAO_APP_ID 未配置");
  }

  const actionParams = {
    Action: DOUBAO_VOICE_LIST_ACTION,
    Version: DOUBAO_OPENAPI_VERSION,
  };
  const query = buildCanonicalQuery(actionParams);
  const url = `https://${DOUBAO_OPENAPI_HOST}/?${query}`;

  const body: Record<string, unknown> = {
    AppID: DOUBAO_APP_ID,
  };

  if (DOUBAO_VOICE_STATE) {
    body.State = DOUBAO_VOICE_STATE;
  }

  if (DOUBAO_VOICE_RESOURCE_IDS) {
    body.ResourceIDs = DOUBAO_VOICE_RESOURCE_IDS.split(",").map((value) => value.trim()).filter(Boolean);
  }

  const payload = JSON.stringify(body);
  const payloadHash = sha256Hex(payload);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    Host: DOUBAO_OPENAPI_HOST,
    "X-Date": amzDate,
    "X-Content-Sha256": payloadHash,
  };

  const { canonical, signed } = buildCanonicalHeaders(headers);
  const canonicalRequest = [
    "POST",
    "/",
    query,
    canonical,
    signed,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${DOUBAO_OPENAPI_REGION}/${DOUBAO_OPENAPI_SERVICE}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = buildSigningKey(DOUBAO_SECRET_ACCESS_KEY, dateStamp);
  const signature = hmacSha256Hex(signingKey, stringToSign);
  headers.Authorization = `HMAC-SHA256 Credential=${DOUBAO_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signed}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: payload,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data?.ResponseMetadata?.Error?.Message || `HTTP ${response.status}`;
    throw new Error(`获取音色列表失败: ${message}`);
  }

  if (data?.ResponseMetadata?.Error?.Message) {
    throw new Error(`获取音色列表失败: ${data.ResponseMetadata.Error.Message}`);
  }

  const statuses = Array.isArray(data?.Result?.Statuses) ? data.Result.Statuses : [];
  const voices: DoubaoVoice[] = [];
  const seen = new Set<string>();

  for (const status of statuses) {
    if (!status || typeof status !== "object") continue;
    const state = status.State;
    if (state && !["Success", "Active"].includes(state)) continue;
    const id = toCleanString(status.SpeakerID);
    if (!id || seen.has(id)) continue;
    const name = toCleanString(status.Alias) || id;
    voices.push({ id, name });
    seen.add(id);
  }

  return voices;
};

const fetchOpenSpeechVoiceList = async () => {
  if (!DOUBAO_API_KEY) {
    throw new Error("DOUBAO_API_KEY 未配置");
  }

  let url = DOUBAO_VOICE_LIST_URL;
  try {
    const parsed = new URL(url);
    if (DOUBAO_APP_ID && !parsed.searchParams.has("app_id") && DOUBAO_VOICE_LIST_METHOD === "GET") {
      parsed.searchParams.set("app_id", DOUBAO_APP_ID);
    }
    url = parsed.toString();
  } catch (err) {
    // Ignore invalid URL parsing and use as-is.
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (DOUBAO_API_KEY) {
    headers["x-api-key"] = DOUBAO_API_KEY;
  }

  if (DOUBAO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${DOUBAO_ACCESS_TOKEN}`;
  }

  if (DOUBAO_APP_ID) {
    headers["X-App-Id"] = DOUBAO_APP_ID;
  }

  if (DOUBAO_RESOURCE_ID) {
    headers["Resource-Id"] = DOUBAO_RESOURCE_ID;
  }

  const response = await fetch(url, {
    method: DOUBAO_VOICE_LIST_METHOD,
    headers,
    cache: "no-store",
    body:
      DOUBAO_VOICE_LIST_METHOD === "POST"
        ? JSON.stringify({
            app: {
              app_id: DOUBAO_APP_ID || undefined,
              cluster: DOUBAO_CLUSTER,
            },
            user: {
              uid: DOUBAO_USER_UID,
            },
          })
        : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`获取音色列表失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return normalizeVoices(data);
};

export const fetchDoubaoVoiceList = async () => {
  if (DOUBAO_ACCESS_KEY_ID && DOUBAO_SECRET_ACCESS_KEY) {
    return fetchVolcengineVoiceList();
  }

  return fetchOpenSpeechVoiceList();
};
