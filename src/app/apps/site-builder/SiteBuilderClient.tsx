"use client";

import { useEffect, useMemo, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { marked } from "marked";
import TurndownService from "turndown";
import styles from "./site-builder.module.css";

type Project = {
  id: string;
  title: string;
  description: string | null;
  user_prompt: string;
  generated_html: string;
  created_at: string;
};

type Conversation = {
  id: string;
  project_id: string;
  role: "user" | "builder" | "image_agent";
  content: string;
  created_at: string;
};

type ImageAsset = {
  id: string;
  project_id: string;
  slot_id: string | null;
  section: string | null;
  usage: string;
  prompt: string;
  negative_prompt: string | null;
  style: string | null;
  aspect_ratio: string | null;
  size: string | null;
  seed: number | null;
  image_url: string | null;
  created_at: string;
};

type ImageDraft = {
  slot_id: string;
  usage: string;
  section: string;
  prompt: string;
  negative_prompt: string;
  style: string;
  aspect_ratio: string;
  size: string;
  seed: number | null;
};

type PreviewToken = {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

type ChatItem = {
  id: string;
  role: "user" | "builder" | "image_agent";
  content: string;
  created_at: string;
};

type Props = {
  initialProjects: Project[];
  initialConversations: Conversation[];
  initialImages: ImageAsset[];
  initialActiveProjectId: string | null;
};

const AudioNode = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "audio" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["audio", { ...HTMLAttributes, controls: "true" }];
  },
});

const EmbedNode = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      title: { default: "embed" },
    };
  },
  parseHTML() {
    return [{ tag: "iframe" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      {
        ...HTMLAttributes,
        width: "100%",
        height: "360",
        frameborder: "0",
        allowfullscreen: "true",
      },
    ];
  },
});

const ImageSlot = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-sb-image": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-sb-image"),
        renderHTML: (attributes) => {
          if (!attributes["data-sb-image"]) return {};
          return { "data-sb-image": attributes["data-sb-image"] };
        },
      },
    };
  },
});

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function buildImageInjectedHtml(html: string, images: ImageAsset[]) {
  if (!html || images.length === 0) return html;
  const slotMatches =
    html.match(/data-sb-image\s*=\s*["']([^"']+)["']/gi) ?? [];
  const slots = new Set(
    slotMatches
      .map((entry) => entry.split("=").pop() ?? "")
      .map((value) => value.replace(/['"]/g, "").trim())
      .filter(Boolean)
  );
  const map = images.reduce<Record<string, string>>((acc, image) => {
    if (image.slot_id && image.image_url) {
      acc[image.slot_id] = image.image_url;
    }
    return acc;
  }, {});
  const filteredMap = Object.keys(map).reduce<Record<string, string>>(
    (acc, key) => {
      if (slots.has(key)) {
        acc[key] = map[key];
      }
      return acc;
    },
    {}
  );
  if (slots.size === 0 || Object.keys(filteredMap).length === 0) {
    const galleryItems = images
      .filter((img) => img.image_url)
      .map(
        (img) =>
          `<figure style="margin:0;display:grid;gap:8px;"><img src="${img.image_url}" alt="${img.usage}" style="width:100%;border-radius:12px;border:1px solid rgba(148,163,184,0.2);" /><figcaption style="font-size:12px;color:#cbd5f5;">${img.usage}</figcaption></figure>`
      )
      .join("");
    const gallery = `
<section style="padding:24px;background:#0b0f1f;color:#e2e8f0;"><h2 style="margin:0 0 16px;font-size:18px;">Generated Images</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">${galleryItems}</div></section>
`;
    if (html.includes("</body>")) {
      return html.replace("</body>", `${gallery}</body>`);
    }
    return `${html}${gallery}`;
  }
  const script = `
<script>(function(){const map=${JSON.stringify(
    filteredMap
  )};Object.keys(map).forEach(function(id){const url=map[id];document.querySelectorAll('[data-sb-image="'+id+'"]').forEach(function(el){if(el.tagName.toLowerCase()==='img'){el.setAttribute('src',url);}else{el.style.backgroundImage='url('+url+')';el.style.backgroundSize=el.style.backgroundSize||'cover';el.style.backgroundPosition=el.style.backgroundPosition||'center';}});});})();</script>
`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }
  return `${html}${script}`;
}

function extractBodyHtml(html: string) {
  if (!html) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.body?.innerHTML?.trim() || "";
  } catch {
    return "";
  }
}

function mergeHtmlDocument(baseHtml: string, bodyHtml: string) {
  const fallback = `<!doctype html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head><body>${bodyHtml}</body></html>`;
  if (!baseHtml) return fallback;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(baseHtml, "text/html");
    doc.body.innerHTML = bodyHtml;
    const hasDoctype = /<!doctype/i.test(baseHtml);
    const html = doc.documentElement.outerHTML;
    return hasDoctype ? `<!doctype html>\n${html}` : html;
  } catch {
    return fallback;
  }
}

function placeholderDataUrl(label: string) {
  const safeLabel = label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520"><rect width="100%" height="100%" fill="#f1f5f9"/><rect x="40" y="40" width="820" height="440" rx="18" ry="18" fill="#ffffff" stroke="#cbd5f5" stroke-width="3"/><g fill="none" stroke="#94a3b8" stroke-width="6"><rect x="140" y="140" width="240" height="180" rx="12"/><circle cx="210" cy="200" r="28"/><path d="M140 320l70-70 60 60 70-90 80 100"/></g><text x="50%" y="70%" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#64748b">Image Placeholder</text><text x="50%" y="78%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8">${safeLabel}</text></svg>`;
  const encoded = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

function prepareEditorBodyHtml(html: string) {
  if (!html) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const placeholder = placeholderDataUrl("未生成图片");
    doc.querySelectorAll<HTMLElement>("[data-sb-image]").forEach((el) => {
      if (el.tagName.toLowerCase() === "img") {
        const img = el as HTMLImageElement;
        if (!img.getAttribute("src")) {
          img.setAttribute("src", placeholder);
        }
      } else {
        const id = el.getAttribute("data-sb-image") || "placeholder";
        const img = doc.createElement("img");
        img.setAttribute("data-sb-image", id);
        img.setAttribute("src", placeholder);
        img.setAttribute("alt", id);
        img.style.width = "100%";
        img.style.borderRadius = "12px";
        img.style.border = "1px solid #cbd5f5";
        el.replaceWith(img);
      }
    });
    return doc.body.innerHTML.trim();
  } catch {
    return "";
  }
}

export default function SiteBuilderClient({
  initialProjects,
  initialConversations,
  initialImages,
  initialActiveProjectId,
}: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialActiveProjectId
  );
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [images, setImages] = useState<ImageAsset[]>(initialImages);
  const [prompt, setPrompt] = useState("");
  const initialProject = initialProjects.find(
    (project) => project.id === initialActiveProjectId
  );
  const [baseHtml, setBaseHtml] = useState(
    () => initialProject?.generated_html ?? ""
  );
  const [renderedHtml, setRenderedHtml] = useState(() =>
    buildImageInjectedHtml(initialProject?.generated_html ?? "", initialImages)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState("");
  const [showImageConfirm, setShowImageConfirm] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [liveMessages, setLiveMessages] = useState<ChatItem[]>([]);
  const [previewTokens, setPreviewTokens] = useState<PreviewToken[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [sidebarTab, setSidebarTab] = useState<
    "projects" | "code" | "images" | "plugins"
  >("projects");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [showImageProgress, setShowImageProgress] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageProgressText, setImageProgressText] = useState("准备生成图片…");
  const [imageProgressFailed, setImageProgressFailed] = useState(false);
  const [pendingImages, setPendingImages] = useState<ImageAsset[] | null>(null);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const [editCode, setEditCode] = useState(false);
  const [editorMode, setEditorMode] = useState<"rich" | "markdown">("rich");
  const [markdownValue, setMarkdownValue] = useState("");
  const [markdownPreview, setMarkdownPreview] = useState("");

  const turndown = useMemo(() => new TurndownService(), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      ImageSlot,
      AudioNode,
      EmbedNode,
      Placeholder.configure({
        placeholder: "开始编辑你的网页内容…支持 Markdown 与富文本。",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: styles.editorContent,
      },
    },
  });

  useEffect(() => {
    if (editorMode === "markdown") {
      setMarkdownPreview(marked.parse(markdownValue || "") as string);
    }
  }, [markdownValue, editorMode]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  const activePreviewTokens = useMemo(
    () =>
      previewTokens.filter((token) => {
        if (token.revoked_at) return false;
        if (!token.expires_at) return true;
        const expiresAt = new Date(token.expires_at).getTime();
        return Number.isNaN(expiresAt) ? true : Date.now() < expiresAt;
      }),
    [previewTokens]
  );

  const displayMessages = liveMessages.length
    ? liveMessages
    : showHistory
      ? conversations
      : conversations.slice(-3);

  useEffect(() => {
    if (!showCode) return;
    const htmlToHighlight = baseHtml || "";
    setHighlightedCode(
      Prism.highlight(htmlToHighlight, Prism.languages.markup, "markup")
    );
  }, [showCode, baseHtml]);

  useEffect(() => {
    if (editCode && editor) {
      const bodyHtml = prepareEditorBodyHtml(baseHtml);
      if (editorMode === "markdown") {
        setMarkdownValue(turndown.turndown(bodyHtml || ""));
      } else {
        editor.commands.setContent(bodyHtml || "<p></p>");
      }
    }
  }, [editCode, baseHtml, editor, editorMode, turndown]);

  async function refreshProjects(nextActiveId?: string) {
    const res = await fetch("/api/site-builder/projects?limit=20", {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.ok) {
      setProjects(data.projects);
      if (nextActiveId) {
        setActiveProjectId(nextActiveId);
      }
    }
  }

  async function loadPreviewTokens(projectId: string) {
    const res = await fetch(
      `/api/site-builder/preview-tokens?project_id=${projectId}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (data.ok) {
      setPreviewTokens(data.tokens);
    }
  }

  async function loadProjectData(projectId: string) {
    setImageDrafts([]);
    setPendingImages([]);
    setPendingHtml("");
    setShowImageEditor(false);
    const [conversationRes, imageRes, projectRes, tokensRes] = await Promise.all([
      fetch(`/api/site-builder/conversations?project_id=${projectId}`),
      fetch(`/api/site-builder/images?project_id=${projectId}`),
      fetch(`/api/site-builder/projects?project_id=${projectId}`),
      fetch(`/api/site-builder/preview-tokens?project_id=${projectId}`),
    ]);
    const conversationsData = await conversationRes.json();
    const imagesData = await imageRes.json();
    const projectData = await projectRes.json();
    const tokensData = await tokensRes.json();
    let nextBaseHtml = projectData?.project?.generated_html ?? "";
    if (conversationsData.ok) {
      setConversations(conversationsData.conversations);
      setBaseHtml(nextBaseHtml);
    }
    if (imagesData.ok) {
      setImages(imagesData.images);
    }
    if (tokensData.ok) {
      setPreviewTokens(tokensData.tokens);
    }
    setRenderedHtml(
      buildImageInjectedHtml(
        nextBaseHtml,
        imagesData.ok ? imagesData.images : images
      )
    );
  }

  useEffect(() => {
    if (activeProjectId) {
      loadPreviewTokens(activeProjectId);
    }
  }, [activeProjectId]);

  async function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId);
    await loadProjectData(projectId);
    setError("");
  }

  function handleNewProject() {
    setNewProjectTitle("");
    setNewProjectDescription("");
    setShowProjectModal(true);
  }

  async function handleGenerate(promptText?: string) {
    setError("");
    const requestPrompt = (promptText ?? prompt).trim();
    if (!requestPrompt) {
      setError("请输入你想要的页面需求");
      return;
    }
    setLoading(true);
    const now = new Date().toISOString();
    setLiveMessages([
      { id: `live-user-${Date.now()}`, role: "user", content: requestPrompt, created_at: now },
      { id: `live-builder-${Date.now()}`, role: "builder", content: "正在分析需求并梳理结构…", created_at: now },
    ]);
    try {
      const res = await fetch("/api/site-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProjectId,
          prompt: requestPrompt,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "生成失败");
        return;
      }
      const nextProjectId = data.projectId as string;
      await refreshProjects(nextProjectId);
      await loadProjectData(nextProjectId);
      setPrompt("");
      setShowImageConfirm(true);
      setShowHistory(false);
      setLiveMessages([]);
    } catch (err: any) {
      setError(err?.message ?? "生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!activeProject) {
      setError("请先生成一个项目");
      return;
    }
    await handleGenerate(activeProject.user_prompt);
  }

  async function handleOpenImagePromptEditor() {
    if (!activeProjectId) {
      setError("请先生成项目再创建图片");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/site-builder/image-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ project_id: activeProjectId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "生成图片提示失败");
        return;
      }
      setImageDrafts(
        data.images.map(
          (img: {
            id: string;
            usage: string;
            section?: string | null;
            prompt: string;
            negative_prompt?: string | null;
            style?: string | null;
            aspect_ratio?: string | null;
            size?: string | null;
            seed?: number | null;
          }) => ({
            slot_id: img.id,
            usage: img.usage,
            section: img.section ?? "content",
            prompt: img.prompt,
            negative_prompt: img.negative_prompt ?? "",
            style: img.style ?? "",
            aspect_ratio: img.aspect_ratio ?? "",
            size: img.size ?? "",
            seed: img.seed ?? null,
          })
        )
      );
      const conversationRes = await fetch(
        `/api/site-builder/conversations?project_id=${activeProjectId}`,
        { cache: "no-store" }
      );
      const conversationsData = await conversationRes.json();
      if (conversationsData.ok) {
        setConversations(conversationsData.conversations);
      }
      setShowImageEditor(true);
    } catch (err: any) {
      setError(err?.message ?? "生成图片提示失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateImages() {
    if (!activeProjectId) return;
    setLoading(true);
    setShowImageProgress(true);
    setImageProgress(0);
    setImageProgressText("正在生成图片…");
    setImageProgressFailed(false);
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    progressTimer = setInterval(() => {
      setImageProgress((prev) => (prev >= 90 ? prev : prev + 5));
    }, 500);
    try {
      const res = await fetch("/api/site-builder/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProjectId,
          images: imageDrafts,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "生成图片失败");
        setImageProgressText("生成失败，请重试");
        setImageProgressFailed(true);
        setImageProgress(100);
        return;
      }
      setImageProgress(100);
      setImageProgressText("生成完成，请确认查看");
      setPendingImages(data.images);
      setPendingHtml(buildImageInjectedHtml(baseHtml, data.images));
      setShowImageEditor(false);
    } catch (err: any) {
      setError(err?.message ?? "生成图片失败");
      setImageProgressText("生成失败，请重试");
      setImageProgressFailed(true);
      setImageProgress(100);
    } finally {
      setLoading(false);
      if (progressTimer) {
        clearInterval(progressTimer);
      }
    }
  }

  async function handleGenerateImageSingle(draft: ImageDraft) {
    if (!activeProjectId) return;
    setLoading(true);
    setShowImageProgress(true);
    setImageProgress(0);
    setImageProgressText(`正在生成 ${draft.usage} …`);
    setImageProgressFailed(false);
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    progressTimer = setInterval(() => {
      setImageProgress((prev) => (prev >= 90 ? prev : prev + 5));
    }, 500);
    try {
      const res = await fetch("/api/site-builder/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProjectId,
          images: [draft],
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "生成图片失败");
        setImageProgressText("生成失败，请重试");
        setImageProgressFailed(true);
        setImageProgress(100);
        return;
      }
      const nextImages = [
        ...images.filter((img) => img.slot_id !== draft.slot_id),
        ...data.images,
      ];
      setImageProgress(100);
      setImageProgressText("生成完成，请确认查看");
      setPendingImages(nextImages);
      setPendingHtml(buildImageInjectedHtml(baseHtml, nextImages));
    } catch (err: any) {
      setError(err?.message ?? "生成图片失败");
      setImageProgressText("生成失败，请重试");
      setImageProgressFailed(true);
      setImageProgress(100);
    } finally {
      setLoading(false);
      if (progressTimer) {
        clearInterval(progressTimer);
      }
    }
  }

  async function handleSave() {
    if (!activeProjectId) {
      setError("没有可保存的项目");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/site-builder/save-to-apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: activeProjectId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "保存失败");
      }
    } catch (err: any) {
      setError(err?.message ?? "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyPreviewLink(tokenValue?: string) {
    if (!activeProjectId) {
      setError("请先生成项目");
      return;
    }
    const token = tokenValue ?? activePreviewTokens[0]?.token;
    if (!token) {
      setError("请先生成预览链接");
      return;
    }
    const url = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("已复制");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setError("复制失败，请手动复制链接");
    }
  }

  async function handleCreatePreviewLink(openAfter?: boolean) {
    if (!activeProjectId) {
      setError("请先生成项目");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/site-builder/preview-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProjectId,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "生成预览链接失败");
        return;
      }
      const tokenValue = data.token?.token;
      const listRes = await fetch(
        `/api/site-builder/preview-tokens?project_id=${activeProjectId}`,
        { cache: "no-store" }
      );
      const listData = await listRes.json();
      if (listData.ok) {
        setPreviewTokens(listData.tokens);
      }
      if (tokenValue) {
        const url = `${window.location.origin}/p/${tokenValue}`;
        await navigator.clipboard.writeText(url);
        setCopyStatus("预览链接已复制");
        setTimeout(() => setCopyStatus(""), 2000);
        if (openAfter) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "生成预览链接失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject() {
    const title = newProjectTitle.trim();
    const description = newProjectDescription.trim();
    if (!title) {
      setError("请填写项目名称");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/site-builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          user_prompt: "",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "创建项目失败");
        return;
      }
      const projectId = data.project?.id as string;
      await refreshProjects(projectId);
      setShowProjectModal(false);
      setActiveProjectId(projectId);
      setConversations([]);
      setImages([]);
      setPreviewTokens([]);
      setPrompt("");
      setBaseHtml("");
      setRenderedHtml("");
    } catch (err: any) {
      setError(err?.message ?? "创建项目失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEditedHtml() {
    if (!activeProjectId) {
      setError("请先选择项目");
      return;
    }
    const bodyHtml =
      editorMode === "markdown"
        ? ((marked.parse(markdownValue || "") as string) ?? "")
        : editor?.getHTML() ?? "";
    if (!bodyHtml.trim()) {
      setError("请输入有效的 HTML 内容");
      return;
    }
    const mergedHtml = mergeHtmlDocument(baseHtml, bodyHtml);
    setLoading(true);
    try {
      const res = await fetch(`/api/site-builder/projects/${activeProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generated_html: mergedHtml }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "保存失败");
        return;
      }
      setBaseHtml(mergedHtml);
      setRenderedHtml(buildImageInjectedHtml(mergedHtml, images));
      setEditCode(false);
    } catch (err: any) {
      setError(err?.message ?? "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    const confirmed = window.confirm("确定删除该项目吗？此操作不可撤销。");
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/site-builder/projects/${projectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "删除失败");
        return;
      }
      if (activeProjectId === projectId) {
        handleNewProject();
      }
      await refreshProjects();
    } catch (err: any) {
      setError(err?.message ?? "删除失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeToken(tokenValue: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/site-builder/preview-tokens/${tokenValue}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "撤销失败");
        return;
      }
      if (activeProjectId) {
        const listRes = await fetch(
          `/api/site-builder/preview-tokens?project_id=${activeProjectId}`,
          { cache: "no-store" }
        );
        const listData = await listRes.json();
        if (listData.ok) {
          setPreviewTokens(listData.tokens);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "撤销失败");
    } finally {
      setLoading(false);
    }
  }

  function handlePromptKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.shiftKey || event.metaKey)) {
      event.preventDefault();
      handleGenerate();
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <div className={styles.title}>Site Builder</div>
            <div className={styles.subtitle}>Natural language → Web page</div>
          </div>
          <div className={styles.toolbar}>
            <button
              className={styles.neonButton}
              onClick={() => handleGenerate()}
              disabled={loading}
            >
              {loading ? "生成中..." : "生成 / 重新生成"}
            </button>
            <button
              className={styles.ghostButton}
              onClick={handleRegenerate}
              disabled={loading}
            >
              重新生成网页
            </button>
            <button
              className={styles.ghostButton}
              onClick={handleOpenImagePromptEditor}
              disabled={loading}
            >
              仅重新生成图片
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => setShowCode((prev) => !prev)}
            >
              {showCode ? "隐藏网页代码" : "查看网页代码"}
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => {
                setShowCode(true);
                setEditCode((prev) => !prev);
              }}
            >
              {editCode ? "退出编辑" : "编辑网页"}
            </button>
            {editCode && (
              <button
                className={styles.neonButton}
                onClick={handleSaveEditedHtml}
                disabled={loading}
              >
                保存修改
              </button>
            )}
            <button
              className={styles.ghostButton}
              onClick={() => handleCreatePreviewLink(true)}
              disabled={!activeProjectId}
            >
              生成预览链接
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => handleCopyPreviewLink()}
              disabled={!activeProjectId}
            >
              复制最新链接
            </button>
            <button
              className={styles.neonButton}
              onClick={handleSave}
              disabled={loading}
            >
              保存到数据库
            </button>
          </div>
        </div>
        {copyStatus && <div className={styles.muted}>{copyStatus}</div>}
        {error && <div className={styles.errorCard}>{error}</div>}
      </div>

      <div
        className={`${styles.layout} ${
          sidebarCollapsed ? styles.layoutCollapsed : ""
        }`}
      >
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>对话</div>
            <div className={styles.panelActions}>
              <button className={styles.ghostButton} onClick={handleNewProject}>
                新建项目
              </button>
              <button
                className={styles.ghostButton}
                onClick={() => setShowHistory((prev) => !prev)}
              >
                {showHistory ? "隐藏历史" : "展开历史"}
              </button>
            </div>
          </div>

          <div className={styles.chatBox}>
            {displayMessages.length === 0 && (
              <div className={styles.muted}>对话将在这里展示。</div>
            )}
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.chatRow} ${
                  msg.role === "user" ? styles.chatRowUser : ""
                }`}
              >
                <div
                  className={`${styles.chatBubble} ${
                    msg.role === "user"
                      ? styles.chatBubbleUser
                      : msg.role === "builder"
                        ? styles.chatBubbleBuilder
                        : styles.chatBubbleImageAgent
                  }`}
                >
                  <div className={styles.chatRole}>
                    {msg.role === "user"
                      ? "User"
                      : msg.role === "builder"
                        ? "Builder AI"
                        : "Image Agent"}
                  </div>
                  <div className={styles.chatContent}>{msg.content}</div>
                  <div className={styles.chatTime}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.chatComposer}>
            <textarea
              className={styles.textarea}
              placeholder="描述你想要的网页（例如：做一个紫色霓虹风的个人作品集首页）"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handlePromptKeyDown}
            />
            <div className={styles.composerActions}>
              <div className={styles.muted}>Shift/Cmd + Enter 发送</div>
              <button
                className={styles.neonButton}
                onClick={() => handleGenerate()}
                disabled={loading}
              >
                发送
              </button>
            </div>
          </div>

        </section>

        <div className={styles.previewStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>预览</div>
              {activeProject && (
                <div className={styles.muted}>{activeProject.title}</div>
              )}
            </div>
            <div className={styles.previewResizeBox}>
              {editCode ? (
                <div className={styles.editorShell}>
                  <div className={styles.editorToolbar}>
                    <button
                      className={`${styles.editorButton} ${
                        editorMode === "rich" ? styles.editorButtonActive : ""
                      }`}
                      onClick={() => {
                        setEditorMode("rich");
                        if (editor) {
                          const html = marked.parse(markdownValue || "") as string;
                          editor.commands.setContent(html || "<p></p>");
                        }
                      }}
                    >
                      富文本
                    </button>
                    <button
                      className={`${styles.editorButton} ${
                        editorMode === "markdown" ? styles.editorButtonActive : ""
                      }`}
                      onClick={() => {
                        setEditorMode("markdown");
                        const bodyHtml = prepareEditorBodyHtml(baseHtml);
                        setMarkdownValue(turndown.turndown(bodyHtml || ""));
                      }}
                    >
                      Markdown
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                    >
                      加粗
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                    >
                      斜体
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                    >
                      删除线
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() =>
                        editor?.chain().focus().toggleHeading({ level: 1 }).run()
                      }
                    >
                      H1
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() =>
                        editor?.chain().focus().toggleHeading({ level: 2 }).run()
                      }
                    >
                      H2
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() =>
                        editor?.chain().focus().toggleBulletList().run()
                      }
                    >
                      无序
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() =>
                        editor?.chain().focus().toggleOrderedList().run()
                      }
                    >
                      有序
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => editor?.chain().focus().undo().run()}
                    >
                      撤销
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => editor?.chain().focus().redo().run()}
                    >
                      重做
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => {
                        const url = window.prompt("图片 URL");
                        if (!url) return;
                        editor?.commands.setImage({ src: url });
                      }}
                    >
                      添加图片
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => {
                        const url = window.prompt("链接 URL");
                        if (!url) return;
                        const text =
                          editor?.state.selection.empty
                            ? "链接文字"
                            : editor?.state.doc.textBetween(
                                editor.state.selection.from,
                                editor.state.selection.to
                              ) || "链接文字";
                        editor
                          ?.chain()
                          .focus()
                          .insertContent(text)
                          .extendMarkRange("link")
                          .setLink({ href: url })
                          .run();
                      }}
                    >
                      插入链接
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => {
                        const url = window.prompt("音频 URL");
                        if (!url) return;
                        editor
                          ?.chain()
                          .focus()
                          .insertContent({ type: "audio", attrs: { src: url } })
                          .run();
                      }}
                    >
                      插入音频
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => {
                        const url = window.prompt("嵌入链接 URL（iframe）");
                        if (!url) return;
                        editor
                          ?.chain()
                          .focus()
                          .insertContent({ type: "embed", attrs: { src: url } })
                          .run();
                      }}
                    >
                      插入嵌入
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => {
                        editor?.chain().focus().toggleCodeBlock().run();
                      }}
                    >
                      代码块
                    </button>
                    <button
                      className={styles.editorButton}
                      onClick={() => {
                        const markdown = window.prompt("粘贴 Markdown 内容");
                        if (!markdown) return;
                        const html = marked.parse(markdown) as string;
                        if (editorMode === "markdown") {
                          setMarkdownValue(markdown);
                        } else {
                          editor?.commands.setContent(html);
                        }
                      }}
                    >
                      Markdown 导入
                    </button>
                  </div>
                  <div className={styles.editorHost}>
                    {editorMode === "markdown" ? (
                      <div className={styles.markdownSplit}>
                        <textarea
                          className={styles.markdownEditor}
                          value={markdownValue}
                          onChange={(event) => setMarkdownValue(event.target.value)}
                          placeholder="使用 Markdown 编辑网页内容"
                        />
                        <div
                          className={styles.markdownPreview}
                          dangerouslySetInnerHTML={{
                            __html: markdownPreview || "<p>预览内容</p>",
                          }}
                        />
                      </div>
                    ) : editor ? (
                      <EditorContent editor={editor} />
                    ) : (
                      <div className={styles.muted}>编辑器加载中…</div>
                    )}
                  </div>
                </div>
              ) : (
                <iframe
                  className={styles.previewFrame}
                  title="Site preview"
                  sandbox="allow-scripts allow-forms allow-modals"
                  srcDoc={
                    renderedHtml ||
                    "<html><body style='font-family:Arial;padding:24px;'>等待生成内容...</body></html>"
                  }
                />
              )}
            </div>
            <div className={styles.previewFooter}>
              <div className={styles.muted}>图片与布局会自动注入到预览中</div>
            </div>
          </section>

        </div>

        <aside
          className={`${styles.sidebar} ${
            sidebarCollapsed ? styles.sidebarCollapsed : ""
          }`}
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.panelTitle}>侧边栏</div>
            <button
              className={styles.ghostButton}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
            >
              {sidebarCollapsed ? "展开" : "收起"}
            </button>
          </div>

          <div className={styles.sidebarTabs}>
            <button
              className={`${styles.sidebarTab} ${
                sidebarTab === "projects" ? styles.sidebarTabActive : ""
              }`}
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setSidebarTab("projects");
              }}
              title="最近项目"
            >
              <span className={styles.tabIcon}>🗂️</span>
              {!sidebarCollapsed && <span>最近项目</span>}
            </button>
            <button
              className={`${styles.sidebarTab} ${
                sidebarTab === "code" ? styles.sidebarTabActive : ""
              }`}
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setSidebarTab("code");
              }}
              title="代码&资源"
            >
              <span className={styles.tabIcon}>💾</span>
              {!sidebarCollapsed && <span>代码&资源</span>}
            </button>
            <button
              className={`${styles.sidebarTab} ${
                sidebarTab === "images" ? styles.sidebarTabActive : ""
              }`}
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setSidebarTab("images");
              }}
              title="图片素材"
            >
              <span className={styles.tabIcon}>🖼️</span>
              {!sidebarCollapsed && <span>图片素材</span>}
            </button>
            <button
              className={`${styles.sidebarTab} ${
                sidebarTab === "plugins" ? styles.sidebarTabActive : ""
              }`}
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setSidebarTab("plugins");
              }}
              title="插件扩展"
            >
              <span className={styles.tabIcon}>🧩</span>
              {!sidebarCollapsed && <span>插件扩展</span>}
            </button>
          </div>

          {!sidebarCollapsed && <div className={styles.sidebarCard}>
            {sidebarTab === "projects" && (
              <>
                <div className={styles.cardTitle}>最近项目</div>
                <button
                  className={styles.ghostButton}
                  onClick={() => setShowProjects((prev) => !prev)}
                >
                  {showProjects ? "收起" : "查看全部"}
                </button>
                <div className={styles.conversationListResizable}>
                  {(showProjects ? projects : projects.slice(0, 4)).map(
                    (project) => (
                      <div
                        key={project.id}
                        className={`${styles.conversationItem} ${
                          activeProjectId === project.id
                            ? styles.conversationItemActive
                            : ""
                        }`}
                        onClick={() => handleSelectProject(project.id)}
                      >
                        <div className={styles.conversationHeader}>
                          <div className={styles.conversationTitle}>
                            {project.title}
                          </div>
                          <button
                            className={styles.deleteTag}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                          >
                            删除
                          </button>
                        </div>
                        {project.description && (
                          <div className={styles.conversationDescription}>
                            {project.description}
                          </div>
                        )}
                        <div className={styles.conversationMeta}>
                          {formatTime(project.created_at)}
                        </div>
                      </div>
                    )
                  )}
                  {projects.length === 0 && (
                    <div className={styles.muted}>暂无项目记录</div>
                  )}
                </div>
              </>
            )}

            {sidebarTab === "code" && (
              <>
                <div className={styles.cardTitle}>代码 & 预览链接</div>
                {showCode && (
                  <div className={styles.codeBlock}>
                    <pre
                      className={styles.codePre}
                      dangerouslySetInnerHTML={{ __html: highlightedCode }}
                    />
                  </div>
                )}
                {!showCode && (
                  <div className={styles.muted}>点击“查看网页代码”展示源码。</div>
                )}
                <div className={styles.assetList}>
                  <div className={styles.assetTitle}>预览链接</div>
                  {activePreviewTokens.length === 0 && (
                    <div className={styles.muted}>暂无可用链接</div>
                  )}
                  {activePreviewTokens.map((token) => (
                    <div key={token.id} className={styles.tokenRow}>
                      <div className={styles.tokenMeta}>
                        <div className={styles.tokenValue}>/p/{token.token}</div>
                        <div className={styles.muted}>
                          {formatTime(token.created_at)}
                        </div>
                      </div>
                      <div className={styles.tokenActions}>
                        <button
                          className={styles.tokenButton}
                          onClick={() => handleCopyPreviewLink(token.token)}
                        >
                          复制
                        </button>
                        <button
                          className={styles.tokenButton}
                          onClick={() =>
                            window.open(
                              `${window.location.origin}/p/${token.token}`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          打开
                        </button>
                        <button
                          className={styles.tokenButtonDanger}
                          onClick={() => handleRevokeToken(token.token)}
                        >
                          撤销
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sidebarTab === "images" && (
              <>
                <div className={styles.cardTitle}>图片素材</div>
                {images.length === 0 && (
                  <div className={styles.muted}>暂无图片素材</div>
                )}
                {images.map((image) => (
                  <div key={image.id} className={styles.assetCard}>
                    <div className={styles.assetMeta}>{image.usage}</div>
                    <div className={styles.assetPrompt}>{image.prompt}</div>
                    {image.image_url && (
                      <img
                        className={styles.assetImage}
                        src={image.image_url}
                        alt={image.usage}
                      />
                    )}
                  </div>
                ))}
              </>
            )}

            {sidebarTab === "plugins" && (
              <>
                <div className={styles.cardTitle}>插件扩展</div>
                <div className={styles.muted}>
                  SEO / 动画 / 表单功能即将上线
                </div>
              </>
            )}
          </div>}
        </aside>
      </div>

      {showImageConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowImageConfirm(false)}
        >
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>生成配套图片？</div>
              <button
                className={styles.modalClose}
                onClick={() => setShowImageConfirm(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              是否根据当前网页需求，自动生成配套图片素材？
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowImageConfirm(false)}
              >
                暂不生成
              </button>
              <button
                className={styles.neonButton}
                onClick={() => {
                  setShowImageConfirm(false);
                  handleOpenImagePromptEditor();
                }}
              >
                生成图片
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageEditor && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowImageEditor(false)}
        >
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>图片提示词编辑</div>
              <button
                className={styles.modalClose}
                onClick={() => setShowImageEditor(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.muted}>
                将生成 {imageDrafts.length} 张图片，可逐张编辑与生成。
              </div>
              {imageDrafts.map((draft, index) => (
                <div key={draft.slot_id || index} className={styles.imagePromptCard}>
                  <div className={styles.imagePromptHeader}>
                    <div>
                      <div className={styles.label}>{draft.usage}</div>
                      <div className={styles.muted}>
                        {draft.slot_id} · {draft.section || "content"}
                      </div>
                    </div>
                    <button
                      className={styles.ghostButton}
                      onClick={() => handleGenerateImageSingle(draft)}
                      disabled={loading}
                    >
                      生成此图
                    </button>
                  </div>
                  <textarea
                    className={styles.textarea}
                    value={draft.prompt}
                    onChange={(event) => {
                      const value = event.target.value;
                      setImageDrafts((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, prompt: value } : item
                        )
                      );
                    }}
                  />
                  <div className={styles.imagePromptMeta}>
                    <input
                      className={styles.textInput}
                      value={draft.style}
                      onChange={(event) => {
                        const value = event.target.value;
                        setImageDrafts((prev) =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, style: value } : item
                          )
                        );
                      }}
                      placeholder="style"
                    />
                    <input
                      className={styles.textInput}
                      value={draft.aspect_ratio}
                      onChange={(event) => {
                        const value = event.target.value;
                        setImageDrafts((prev) =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, aspect_ratio: value } : item
                          )
                        );
                      }}
                      placeholder="aspect_ratio"
                    />
                    <input
                      className={styles.textInput}
                      value={draft.size}
                      onChange={(event) => {
                        const value = event.target.value;
                        setImageDrafts((prev) =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, size: value } : item
                          )
                        );
                      }}
                      placeholder="size"
                    />
                  </div>
                  <textarea
                    className={styles.textarea}
                    value={draft.negative_prompt}
                    onChange={(event) => {
                      const value = event.target.value;
                      setImageDrafts((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, negative_prompt: value } : item
                        )
                      );
                    }}
                    placeholder="negative prompt (可选)"
                  />
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowImageEditor(false)}
              >
                取消
              </button>
              <button
                className={styles.neonButton}
                onClick={handleGenerateImages}
                disabled={loading}
              >
                {loading ? "生成中..." : "一键批量生成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageProgress && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (imageProgress < 100 && !imageProgressFailed) {
              return;
            }
            if (imageProgress >= 100 && pendingImages && !imageProgressFailed) {
              setImages(pendingImages);
              if (pendingHtml) {
                setRenderedHtml(pendingHtml);
              }
              setPendingImages(null);
              setPendingHtml(null);
            }
            setShowImageProgress(false);
          }}
        >
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>生成图片进度</div>
              <button
                className={styles.modalClose}
                onClick={() => {
                  if (imageProgress < 100 && !imageProgressFailed) {
                    return;
                  }
                  if (imageProgress >= 100 && pendingImages && !imageProgressFailed) {
                    setImages(pendingImages);
                    if (pendingHtml) {
                      setRenderedHtml(pendingHtml);
                    }
                    setPendingImages(null);
                    setPendingHtml(null);
                  }
                  setShowImageProgress(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.progressRow}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${imageProgress}%` }}
                  />
                </div>
                <div className={styles.progressHint}>{imageProgress}%</div>
              </div>
              <div className={styles.muted}>{imageProgressText}</div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  if (imageProgress < 100 && !imageProgressFailed) {
                    return;
                  }
                  setShowImageProgress(false);
                }}
                disabled={imageProgress < 100 && !imageProgressFailed}
              >
                关闭
              </button>
              <button
                className={styles.neonButton}
                disabled={imageProgress < 100 || !pendingImages || imageProgressFailed}
                onClick={() => {
                  if (pendingImages) {
                    setImages(pendingImages);
                    if (pendingHtml) {
                      setRenderedHtml(pendingHtml);
                    }
                    setPendingImages(null);
                    setPendingHtml(null);
                  }
                  setShowImageProgress(false);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowProjectModal(false)}
        >
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>新建项目</div>
              <button
                className={styles.modalClose}
                onClick={() => setShowProjectModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.imagePromptRow}>
                <div className={styles.label}>项目名称</div>
                <input
                  className={styles.textInput}
                  value={newProjectTitle}
                  onChange={(event) => setNewProjectTitle(event.target.value)}
                  placeholder="例如：品牌官网改版"
                />
              </div>
              <div className={styles.imagePromptRow}>
                <div className={styles.label}>项目简介</div>
                <textarea
                  className={styles.textarea}
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                  placeholder="描述这个项目的目标与内容"
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowProjectModal(false)}
              >
                取消
              </button>
              <button
                className={styles.neonButton}
                onClick={handleCreateProject}
                disabled={loading}
              >
                {loading ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
