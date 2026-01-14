import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE = "wb_session";
const SESSION_TTL_DAYS = 30;

const readJsonBody = async (req) => {
  if (req.body) return req.body;
  const raw = await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

const parseCookies = (req) => {
  const header = req.headers?.cookie || "";
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const setCookie = (res, value, { maxAge } = {}) => {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${maxAge}`);
  res.setHeader("Set-Cookie", parts.join("; "));
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createPasswordHash = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
};

const verifyPassword = (password, stored) => {
  if (!stored) return false;
  const [algo, iter, salt, hash] = stored.split("$");
  if (algo !== "pbkdf2" || !iter || !salt || !hash) return false;
  const iterations = Number(iter);
  const candidate = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
};

const getSessionUser = async (req, supabase) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();
  const { data: session, error } = await supabase
    .from("webbuilder_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", now)
    .single();
  if (error || !session) return null;
  const { data: user, error: userError } = await supabase
    .from("webbuilder_users")
    .select("id, username")
    .eq("id", session.user_id)
    .single();
  if (userError || !user) return null;
  return user;
};

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: "Database not configured" });

  if (req.method === "GET") {
    const user = await getSessionUser(req, supabase);
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
    return res.status(200).json({ user });
  }

  if (req.method !== "POST") return res.status(405).end();

  const body = await readJsonBody(req);
  if (body === null) return res.status(400).json({ error: "Invalid JSON body" });
  const { action, username, password } = body || {};

  if (!action) return res.status(400).json({ error: "Missing action" });
  if (action === "logout") {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE];
    if (token) {
      const tokenHash = hashToken(token);
      await supabase.from("webbuilder_sessions").delete().eq("token_hash", tokenHash);
    }
    setCookie(res, "", { maxAge: 0 });
    return res.status(200).json({ ok: true });
  }

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  if (username.length < 2 || password.length < 6) {
    return res.status(400).json({ error: "用户名至少 2 个字符，密码至少 6 个字符" });
  }

  if (action === "register") {
    const { data: existing } = await supabase
      .from("webbuilder_users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: "用户名已存在" });

    const passwordHash = createPasswordHash(password);
    const { data: user, error } = await supabase
      .from("webbuilder_users")
      .insert([{ username, password_hash: passwordHash }])
      .select("id, username")
      .single();
    if (error || !user) return res.status(500).json({ error: error?.message || "注册失败" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await supabase
      .from("webbuilder_sessions")
      .insert([{ user_id: user.id, token_hash: hashToken(token), expires_at: expiresAt }]);
    if (sessionError) return res.status(500).json({ error: sessionError.message });

    setCookie(res, token, { maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 });
    return res.status(200).json({ user });
  }

  if (action === "login") {
    const { data: user, error } = await supabase
      .from("webbuilder_users")
      .select("id, username, password_hash")
      .eq("username", username)
      .single();
    if (error || !user) return res.status(401).json({ error: "用户名或密码错误" });
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await supabase
      .from("webbuilder_sessions")
      .insert([{ user_id: user.id, token_hash: hashToken(token), expires_at: expiresAt }]);
    if (sessionError) return res.status(500).json({ error: sessionError.message });

    setCookie(res, token, { maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 });
    return res.status(200).json({ user: { id: user.id, username: user.username } });
  }

  if (action === "reset_password") {
    const { targetUsername, newPassword, adminPassword } = body || {};
    if (!targetUsername || !newPassword || !adminPassword) {
      return res.status(400).json({ error: "缺少必要信息" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "新密码至少 6 个字符" });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("webbuilder_users")
      .select("id, username, password_hash")
      .eq("username", "XX")
      .single();
    if (adminError || !adminUser) {
      return res.status(403).json({ error: "管理员账号不存在" });
    }
    if (!verifyPassword(adminPassword, adminUser.password_hash)) {
      return res.status(403).json({ error: "管理员密码错误" });
    }

    const passwordHash = createPasswordHash(newPassword);
    const { error: updateError } = await supabase
      .from("webbuilder_users")
      .update({ password_hash: passwordHash })
      .eq("username", targetUsername);
    if (updateError) {
      return res.status(500).json({ error: updateError.message || "重置失败" });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}
