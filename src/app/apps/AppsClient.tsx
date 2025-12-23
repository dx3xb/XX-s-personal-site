"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import styles from "./apps.module.css";

type AppRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  slug: string;
  title: string;
  description: string;
};

const slugRegex = /^[a-z0-9-]+$/;

export default function AppsClient({ initialApps }: { initialApps: AppRow[] }) {
  const [apps, setApps] = useState<AppRow[]>(initialApps);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>({
    slug: "",
    title: "",
    description: "",
  });
  const [editing, setEditing] = useState<AppRow | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasApps = apps.length > 0;
  const exampleCard = useMemo(
    () => ({
      title: "示例 App：新建你的第一个项目",
      description: "创建一个新的小实验，马上开始迭代和收藏。",
      slug: "sample-app",
    }),
    []
  );

  async function refreshApps() {
    const res = await fetch("/api/apps", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) {
      setApps(data.apps);
    }
  }

  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm({ slug: "", title: "", description: "" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(app: AppRow) {
    setMode("edit");
    setEditing(app);
    setForm({ slug: app.slug, title: app.title, description: app.description });
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (!submitting) {
      setModalOpen(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
    };

    if (mode === "create" && !slugRegex.test(payload.slug)) {
      setError("slug 只能包含小写字母、数字和连字符");
      return;
    }

    if (!payload.title || !payload.description || (mode === "create" && !payload.slug)) {
      setError("请填写完整信息");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(mode === "create" ? "/api/apps" : `/api/apps/${editing?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "create"
            ? payload
            : { title: payload.title, description: payload.description }
        ),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "操作失败");
        return;
      }
      await refreshApps();
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFavorite(app: AppRow) {
    try {
      await fetch(`/api/apps/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !app.is_favorite }),
      });
      await refreshApps();
    } catch {
      // noop
    }
  }

  async function handleDelete(app: AppRow) {
    const ok = window.confirm(`确认删除 "${app.title}"？此操作不可撤销。`);
    if (!ok) return;
    try {
      await fetch(`/api/apps/${app.id}`, { method: "DELETE" });
      await refreshApps();
    } catch {
      // noop
    }
  }

  return (
    <>
      <div className={styles.actionBar}>
        <button className={styles.primaryButton} onClick={openCreate}>
          新建项目
        </button>
      </div>

      <section className={styles.cards}>
        {hasApps
          ? apps.map((app) => (
              <article key={app.id} className={styles.card}>
                <div>
                  <div className={styles.cardTitle}>{app.title}</div>
                  <div className={styles.cardSlug}>/{app.slug}</div>
                </div>
                <div className={styles.cardDescription}>{app.description}</div>
                <div className={styles.cardFooter}>
                  <Link className={styles.linkButton} href={`/apps/${app.slug}`}>
                    打开这个 App →
                  </Link>
                  <div className={styles.actions}>
                    <button
                      className={styles.iconButton}
                      onClick={() => openEdit(app)}
                    >
                      ✏️
                    </button>
                    <button
                      className={`${styles.iconButton} ${
                        app.is_favorite ? styles.favoriteActive : ""
                      }`}
                      onClick={() => handleFavorite(app)}
                    >
                      ⭐️
                    </button>
                    <button
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      onClick={() => handleDelete(app)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </article>
            ))
          : (
              <article className={`${styles.card} ${styles.emptyCard}`}>
                <div className={styles.cardTitle}>{exampleCard.title}</div>
                <div className={styles.cardSlug}>/{exampleCard.slug}</div>
                <div className={styles.cardDescription}>
                  {exampleCard.description}
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.linkButton}>创建后会显示在这里</span>
                </div>
              </article>
            )}
      </section>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {mode === "create" ? "新建项目" : "编辑项目"}
              </div>
              <button className={styles.modalClose} onClick={closeModal}>
                ✕
              </button>
            </div>
            <form className={styles.formGrid} onSubmit={handleSubmit}>
              <div>
                <div className={styles.label}>Slug</div>
                <input
                  className={styles.input}
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: event.target.value.toLowerCase(),
                    }))
                  }
                  placeholder="例如：hello-world"
                  disabled={mode === "edit"}
                />
              </div>
              <div>
                <div className={styles.label}>Title</div>
                <input
                  className={styles.input}
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="项目标题"
                />
              </div>
              <div>
                <div className={styles.label}>Description</div>
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="一句话描述它做什么"
                />
              </div>
              {error && <div className={styles.errorText}>{error}</div>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeModal}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={submitting}
                >
                  {submitting ? "提交中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
