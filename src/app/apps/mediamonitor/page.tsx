"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  CalendarDays,
  Play,
  StopCircle,
  Download,
  History,
  Trash2,
} from "lucide-react";
import { marked } from "marked";

const API_BASE =
  process.env.NEXT_PUBLIC_MEDIAMONITOR_API_URL ||
  process.env.MEDIAMONITOR_API_URL ||
  "http://localhost:8000";

const PLATFORM_OPTIONS = [
  { id: "wb", label: "微博" },
  { id: "xhs", label: "小红书" },
  { id: "dy", label: "抖音" },
  { id: "ks", label: "快手" },
  { id: "bili", label: "B站" },
  { id: "zhihu", label: "知乎" },
  { id: "tieba", label: "贴吧" },
];

marked.setOptions({
  breaks: true,
  gfm: true,
});

type JobStatus = "pending" | "running" | "completed" | "failed" | "canceled";

export default function MediaMonitorPage() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["wb", "xhs", "bili"]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>("pending");
  const [logs, setLogs] = useState("");
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobHistory, setJobHistory] = useState<
    { id: string; status: JobStatus; created_at: string; updated_at: string; query: string }[]
  >([]);

  const terminalRef = useRef<HTMLDivElement | null>(null);

  const statusLabel = useMemo(() => {
    if (status === "running") return "分析中";
    if (status === "completed") return "已完成";
    if (status === "failed") return "失败";
    if (status === "canceled") return "已取消";
    return "待启动";
  }, [status]);

  const statusIcon = useMemo(() => {
    if (status === "running") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (status === "failed") return <AlertTriangle className="h-4 w-4 text-red-400" />;
    if (status === "canceled") return <AlertTriangle className="h-4 w-4 text-orange-400" />;
    return <Play className="h-4 w-4 text-slate-400" />;
  }, [status]);

  const renderedReport = useMemo(() => {
    if (reportMarkdown && reportMarkdown.trim()) {
      return marked.parse(reportMarkdown);
    }
    return reportHtml || "";
  }, [reportMarkdown, reportHtml]);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`);
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);
        const data = await response.json();
        if (!active) return;
        setStatus(data.status);
        setLogs(data.logs || "");
        setReportMarkdown(data.report_markdown || null);
        setReportHtml(data.report_html || null);
        setError(data.error || null);
        if (data.status === "completed" || data.status === "failed") {
          return;
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "轮询失败");
      }
      if (active) {
        timer = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/jobs?limit=20`);
      if (!response.ok) return;
      const data = await response.json();
      setJobHistory(data || []);
    } catch {
      // ignore history errors
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const startAnalysis = async () => {
    if (!query.trim()) return;
    setIsSubmitting(true);
    setLogs("");
    setReportMarkdown(null);
    setReportHtml(null);
    setError(null);
    setStatus("pending");
    try {
      const response = await fetch(`${API_BASE}/api/v1/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          date: date || null,
          platforms,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`启动失败: ${text}`);
      }
      const data = await response.json();
      setJobId(data.job_id);
      setStatus("running");
      loadHistory();
    } catch (err: any) {
      setError(err?.message || "启动失败");
      setStatus("failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelJob = async () => {
    if (!jobId) return;
    try {
      await fetch(`${API_BASE}/api/v1/jobs/${jobId}/cancel`, { method: "POST" });
      setStatus("canceled");
      loadHistory();
    } catch (err: any) {
      setError(err?.message || "取消失败");
    }
  };

  const downloadReport = () => {
    if (!jobId) return;
    window.open(`${API_BASE}/api/v1/jobs/${jobId}/download`, "_blank", "noopener,noreferrer");
  };

  const deleteJob = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/v1/jobs/${id}`, { method: "DELETE" });
      if (jobId === id) {
        setJobId(null);
        setStatus("pending");
        setReportMarkdown(null);
        setReportHtml(null);
        setLogs("");
      }
      loadHistory();
    } catch (err: any) {
      setError(err?.message || "删除失败");
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/apps/mediamonitor/image/logo_compressed.png"
              alt="BettaFish"
              className="h-12 w-12 rounded-xl border border-white/10 bg-white/10 object-contain p-2"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                xxlab.io
              </p>
              <h1 className="text-2xl font-semibold text-white">
                MediaMonitor 舆情分析面板
              </h1>
              <p className="text-sm text-slate-400">
                实时采集 + AI 研判 + 报告生成
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            {statusIcon}
            <span>{statusLabel}</span>
            {jobId && (
              <span className="text-slate-500">#{jobId.slice(0, 8)}</span>
            )}
          </div>
        </div>

        <section className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-2xl shadow-black/40">
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Search Query
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入舆情关键词，例如：新能源电池安全"
                  className="w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                提示：输入具体品牌或事件可以获得更清晰的趋势分析。
              </p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Date
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <CalendarDays className="h-5 w-5 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent text-sm text-white focus:outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                为空则默认使用当天数据。
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((platform) => {
                const active = platforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              选中平台：{platforms.length > 0 ? platforms.join(", ") : "未选择"}
            </div>
            <button
              onClick={startAnalysis}
              disabled={isSubmitting || status === "running"}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting || status === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              启动分析
            </button>
            {status === "running" && jobId && (
              <button
                onClick={cancelJob}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500 hover:text-red-300"
              >
                <StopCircle className="h-4 w-4" />
                取消任务
              </button>
            )}
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr,1.7fr,0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-black/60 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Progress Terminal
              </h2>
              <span className="text-xs text-slate-500">
                {logs ? "实时输出" : "等待任务"}
              </span>
            </div>
            <div
              ref={terminalRef}
              className="h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0e0f13] p-4 text-xs text-slate-200"
            >
              <pre className="whitespace-pre-wrap leading-relaxed">
                {logs || "暂无日志输出。"}
              </pre>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                AI 报告
              </h2>
              <span className="text-xs text-slate-500">
                {status === "completed" ? "已生成" : "等待完成"}
              </span>
            </div>
            <div className="h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-white/10 p-6 text-sm text-slate-100">
              {status !== "completed" && !renderedReport && (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                  <p>报告生成中，请稍候。</p>
                </div>
              )}
              {status === "completed" && renderedReport && (
                <article
                  className="text-sm leading-7 text-slate-100"
                  dangerouslySetInnerHTML={{ __html: renderedReport }}
                />
              )}
            </div>
            {status === "completed" && jobId && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white/40"
                >
                  <Download className="h-4 w-4" /> 下载报告
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                <History className="h-4 w-4" /> 任务历史
              </h2>
              <button
                onClick={loadHistory}
                className="text-xs text-slate-400 hover:text-white"
              >
                刷新
              </button>
            </div>
            <div className="space-y-3">
              {jobHistory.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
                  暂无任务记录
                </div>
              )}
              {jobHistory.map((job) => (
                <div
                  key={job.id}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs text-slate-200 transition hover:border-white/30"
                >
                  <button
                    onClick={() => {
                      setJobId(job.id);
                      setStatus(job.status);
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {job.query || "未命名任务"}
                      </span>
                      <span className="text-[10px] uppercase text-slate-400">
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">
                      创建时间：{new Date(job.created_at).toLocaleString()}
                    </p>
                  </button>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteJob(job.id);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
