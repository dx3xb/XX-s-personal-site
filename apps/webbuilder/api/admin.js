import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getAdminUser = async (req, supabase) => {
  const cookies = parseCookies(req);
  const token = cookies.wb_session;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();
  const { data: session } = await supabase
    .from("webbuilder_sessions")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .gt("expires_at", now)
    .single();
  if (!session?.user_id) return null;
  const { data: user } = await supabase
    .from("webbuilder_users")
    .select("id, username")
    .eq("id", session.user_id)
    .single();
  if (!user || user.username !== "XX") return null;
  return user;
};

const createPasswordHash = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
};

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: "Database not configured" });

  const admin = await getAdminUser(req, supabase);
  if (!admin) return res.status(403).json({ error: "FORBIDDEN" });

  if (req.method === "GET") {
    const { data: users, error } = await supabase
      .from("webbuilder_users")
      .select("id, username, created_at")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const { data: projects } = await supabase.from("webbuilder_projects").select("user_id");
    const { data: notes } = await supabase.from("webbuilder_notes").select("user_id");

    const projectCounts = (projects || []).reduce((acc, row) => {
      if (!row.user_id) return acc;
      acc[row.user_id] = (acc[row.user_id] || 0) + 1;
      return acc;
    }, {});
    const noteCounts = (notes || []).reduce((acc, row) => {
      if (!row.user_id) return acc;
      acc[row.user_id] = (acc[row.user_id] || 0) + 1;
      return acc;
    }, {});

    const result = (users || []).map((user) => ({
      ...user,
      projectCount: projectCounts[user.id] || 0,
      noteCount: noteCounts[user.id] || 0,
    }));

    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" });
    const { action, payload } = body || {};

    if (action === "reset_password") {
      const targetId = payload?.userId;
      const newPassword = payload?.newPassword;
      if (!targetId || !newPassword) {
        return res.status(400).json({ error: "缺少必要信息" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "新密码至少 6 个字符" });
      }
      const passwordHash = createPasswordHash(newPassword);
      const { error } = await supabase
        .from("webbuilder_users")
        .update({ password_hash: passwordHash })
        .eq("id", targetId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  return res.status(405).end();
}
