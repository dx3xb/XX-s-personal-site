"use client";

import { useEffect, useState, type CSSProperties } from "react";

type PreviewProps = {
  projectId?: string;
  token?: string;
};

export default function PreviewClient({ projectId, token }: PreviewProps) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const width = mode === "desktop" ? "100%" : "420px";
  const frameStyle: CSSProperties = {
    width,
    height: "90vh",
    border: "none",
    borderRadius: 16,
    background: "#0b0f1f",
  };

  async function fetchPreview(pass?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/site-builder/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId ?? "",
          token: token ?? "",
          password: pass ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.requiresPassword) {
          setRequiresPassword(true);
          setHtml("");
          return;
        }
        setError(data?.error ?? "加载失败");
        setHtml("");
        return;
      }
      setHtml(data.html ?? "");
      setRequiresPassword(false);
    } catch (err: any) {
      setError(err?.message ?? "加载失败");
      setHtml("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPreview("");
  }, [projectId, token]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f1f",
        padding: 24,
        color: "#e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setMode("desktop")}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.35)",
            background: mode === "desktop" ? "#1e293b" : "transparent",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
        >
          桌面
        </button>
        <button
          onClick={() => setMode("mobile")}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.35)",
            background: mode === "mobile" ? "#1e293b" : "transparent",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
        >
          移动端
        </button>
      </div>
      {requiresPassword && (
        <div
          style={{
            width: "min(520px, 92vw)",
            border: "1px solid rgba(148,163,184,0.2)",
            borderRadius: 16,
            padding: 20,
            background: "rgba(15,23,42,0.6)",
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>需要密码才能预览</div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="输入预览密码"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.6)",
              color: "#e2e8f0",
            }}
          />
          {error && <div style={{ color: "#fca5a5" }}>{error}</div>}
          <button
            onClick={() => fetchPreview(password)}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid rgba(129,140,248,0.7)",
              background: "rgba(15,23,42,0.6)",
              color: "#f8fafc",
              cursor: "pointer",
            }}
          >
            验证并打开
          </button>
        </div>
      )}
      {!requiresPassword && error && (
        <div style={{ color: "#fca5a5" }}>{error}</div>
      )}
      <iframe
        title="Site Builder Preview"
        sandbox="allow-scripts allow-forms allow-modals"
        srcDoc={
          html ||
          "<html><body style='font-family:Arial;padding:24px;'>等待加载内容...</body></html>"
        }
        style={frameStyle}
      />
      {loading && (
        <div style={{ color: "#94a3b8", fontSize: 12 }}>加载中...</div>
      )}
    </main>
  );
}
