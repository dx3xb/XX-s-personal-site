"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./web-builder.module.css";
import type { Node, PageDSL, StyleProps } from "@/lib/web-builder/dsl";
import { PageRenderer } from "@/lib/web-builder/renderer";
import {
  findNode,
  findNodePath,
  insertChild,
  moveNode,
  removeNode,
  updateNode,
} from "@/lib/web-builder/tree";

type Props = {
  initialPage: PageDSL;
};

type NodeKind = Node["type"];

const DEFAULT_PAGE_ID = "default";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createNode(kind: NodeKind): Node {
  const id = generateId();
  switch (kind) {
    case "container":
      return {
        id,
        type: "container",
        props: { tag: "div" },
        children: [],
        style: { padding: "$space.sm" },
      };
    case "text":
      return {
        id,
        type: "text",
        props: { text: "New text", tag: "p" },
        style: { fontSize: "$fontSizes.base" },
      };
    case "button":
      return {
        id,
        type: "button",
        props: { text: "Click me" },
        style: {
          padding: "$space.sm",
          backgroundColor: "$colors.primary",
          color: "#0b0f1f",
          borderRadius: 8,
        },
      };
    case "link":
      return {
        id,
        type: "link",
        props: { text: "Link", href: "https://example.com" },
      };
    case "image":
      return {
        id,
        type: "image",
        props: {
          src: "https://placehold.co/600x400",
          alt: "Placeholder",
        },
        style: { width: "100%", borderRadius: 12 },
      };
    default:
      return {
        id,
        type: "text",
        props: { text: "New node", tag: "p" },
      };
  }
}

function formatStyleValue(value: StyleProps[keyof StyleProps]) {
  if (value === undefined) return "";
  return String(value);
}

export default function WebBuilderClient({ initialPage }: Props) {
  const [page, setPage] = useState<PageDSL>(initialPage);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPage.root.id
  );
  const [status, setStatus] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [newNodeType, setNewNodeType] = useState<NodeKind>("text");

  const selectedNode = useMemo(
    () => (selectedId ? findNode(page.root, selectedId) : null),
    [page.root, selectedId]
  );

  const selectedPath = useMemo(
    () => (selectedId ? findNodePath(page.root, selectedId) : null),
    [page.root, selectedId]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(
          `/api/web-builder/pages/${DEFAULT_PAGE_ID}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data?.page) {
            setPage(data.page);
            setSelectedId(data.page.root?.id ?? null);
          }
          return;
        }
        await fetch(`/api/web-builder/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: initialPage }),
        });
      } catch (error) {
        setStatus("加载失败，请稍后重试。");
      }
    };
    load();
  }, [initialPage]);

  const updateStyle = (key: keyof StyleProps, value: string) => {
    if (!selectedId) return;
    setPage((current) =>
      ({
        ...current,
        root: updateNode(current.root, selectedId, (node) => ({
          ...node,
          style: {
            ...(node.style ?? {}),
            [key]: value === "" ? undefined : value,
          },
        })),
      })
    );
  };

  const updateProps = (key: string, value: string) => {
    if (!selectedId || !selectedNode) return;
    setPage((current) =>
      ({
        ...current,
        root: updateNode(current.root, selectedId, (node) => ({
          ...(() => {
            switch (node.type) {
              case "container":
                return { ...node, props: { ...(node.props ?? {}), [key]: value } };
              case "text":
                return { ...node, props: { ...node.props, [key]: value } };
              case "button":
                return { ...node, props: { ...node.props, [key]: value } };
              case "link":
                return { ...node, props: { ...node.props, [key]: value } };
              case "image":
                return { ...node, props: { ...node.props, [key]: value } };
              default:
                return node;
            }
          })(),
        })),
      })
    );
  };

  const handleAddNode = () => {
    if (!selectedId) return;
    const parent = selectedNode?.type === "container" ? selectedId : selectedPath?.parent?.id;
    if (!parent) return;
    const child = createNode(newNodeType);
    setPage((current) => ({
      ...current,
      root: insertChild(current.root, parent, child),
    }));
    setSelectedId(child.id);
  };

  const handleDeleteNode = () => {
    if (!selectedId || selectedId === page.root.id) return;
    setPage((current) => ({
      ...current,
      root: removeNode(current.root, selectedId),
    }));
    setSelectedId(page.root.id);
  };

  const handleMove = (delta: number) => {
    if (!selectedId) return;
    setPage((current) => ({
      ...current,
      root: moveNode(current.root, selectedId, delta),
    }));
  };

  const handleSave = async () => {
    setStatus("");
    try {
      const response = await fetch(`/api/web-builder/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setStatus(data?.error ?? "保存失败");
        return;
      }
      setStatus("已保存");
    } catch (error) {
      setStatus("保存失败，请检查网络。");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setStatus("请输入需求描述。");
      return;
    }
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/web-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setStatus(data?.error ?? "生成失败");
        return;
      }
      setPage(data.page);
      setSelectedId(data.page.root.id);
      setStatus("生成完成");
    } catch (error) {
      setStatus("生成失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Web Builder</h1>
          <p className={styles.subtitle}>Schema-first visual builder</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleSave}>
            保存
          </button>
        </div>
      </header>
      <section className={styles.promptRow}>
        <textarea
          className={styles.promptInput}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="输入需求描述，让 AI 生成页面结构"
        />
        <button
          className={styles.secondaryButton}
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? "生成中..." : "AI 生成"}
        </button>
      </section>
      {status ? <div className={styles.status}>{status}</div> : null}
      <div className={styles.layout}>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>Tree</div>
          <TreeView
            node={page.root}
            level={0}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>
        <main className={styles.canvas}>
          <PageRenderer
            page={page}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </main>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>Inspector</div>
          <div className={styles.section}>
            <label className={styles.label}>Page Title</label>
            <input
              className={styles.input}
              value={page.title}
              onChange={(event) =>
                setPage((current) => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          {selectedNode ? (
            <>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>节点信息</div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>ID</span>
                  <span className={styles.metaValue}>{selectedNode.id}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>类型</span>
                  <span className={styles.metaValue}>{selectedNode.type}</span>
                </div>
              </div>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>属性</div>
                {selectedNode.type === "text" && (
                  <>
                    <label className={styles.label}>Text</label>
                    <textarea
                      className={styles.textarea}
                      value={selectedNode.props.text}
                      onChange={(event) =>
                        updateProps("text", event.target.value)
                      }
                    />
                  </>
                )}
                {selectedNode.type === "button" && (
                  <>
                    <label className={styles.label}>Button Text</label>
                    <input
                      className={styles.input}
                      value={selectedNode.props.text}
                      onChange={(event) =>
                        updateProps("text", event.target.value)
                      }
                    />
                  </>
                )}
                {selectedNode.type === "link" && (
                  <>
                    <label className={styles.label}>Link Text</label>
                    <input
                      className={styles.input}
                      value={selectedNode.props.text}
                      onChange={(event) =>
                        updateProps("text", event.target.value)
                      }
                    />
                    <label className={styles.label}>Href</label>
                    <input
                      className={styles.input}
                      value={selectedNode.props.href}
                      onChange={(event) =>
                        updateProps("href", event.target.value)
                      }
                    />
                  </>
                )}
                {selectedNode.type === "image" && (
                  <>
                    <label className={styles.label}>Image URL</label>
                    <input
                      className={styles.input}
                      value={selectedNode.props.src}
                      onChange={(event) =>
                        updateProps("src", event.target.value)
                      }
                    />
                    <label className={styles.label}>Alt Text</label>
                    <input
                      className={styles.input}
                      value={selectedNode.props.alt ?? ""}
                      onChange={(event) =>
                        updateProps("alt", event.target.value)
                      }
                    />
                  </>
                )}
              </div>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>样式</div>
                <label className={styles.label}>Padding</label>
                <input
                  className={styles.input}
                  value={formatStyleValue(selectedNode.style?.padding)}
                  onChange={(event) =>
                    updateStyle("padding", event.target.value)
                  }
                  placeholder="$space.md"
                />
                <label className={styles.label}>Margin</label>
                <input
                  className={styles.input}
                  value={formatStyleValue(selectedNode.style?.margin)}
                  onChange={(event) =>
                    updateStyle("margin", event.target.value)
                  }
                  placeholder="$space.sm"
                />
                <label className={styles.label}>Font Size</label>
                <input
                  className={styles.input}
                  value={formatStyleValue(selectedNode.style?.fontSize)}
                  onChange={(event) =>
                    updateStyle("fontSize", event.target.value)
                  }
                  placeholder="$fontSizes.lg"
                />
                <label className={styles.label}>Color</label>
                <input
                  className={styles.input}
                  value={formatStyleValue(selectedNode.style?.color)}
                  onChange={(event) =>
                    updateStyle("color", event.target.value)
                  }
                  placeholder="$colors.text"
                />
                <label className={styles.label}>Background</label>
                <input
                  className={styles.input}
                  value={formatStyleValue(selectedNode.style?.backgroundColor)}
                  onChange={(event) =>
                    updateStyle("backgroundColor", event.target.value)
                  }
                  placeholder="$colors.surface"
                />
              </div>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>结构</div>
                <div className={styles.row}>
                  <select
                    className={styles.select}
                    value={newNodeType}
                    onChange={(event) =>
                      setNewNodeType(event.target.value as NodeKind)
                    }
                  >
                    <option value="text">Text</option>
                    <option value="container">Container</option>
                    <option value="button">Button</option>
                    <option value="link">Link</option>
                    <option value="image">Image</option>
                  </select>
                  <button className={styles.secondaryButton} onClick={handleAddNode}>
                    添加节点
                  </button>
                </div>
                <div className={styles.row}>
                  <button
                    className={styles.ghostButton}
                    onClick={() => handleMove(-1)}
                    disabled={!selectedPath?.parent}
                  >
                    上移
                  </button>
                  <button
                    className={styles.ghostButton}
                    onClick={() => handleMove(1)}
                    disabled={!selectedPath?.parent}
                  >
                    下移
                  </button>
                  <button
                    className={styles.dangerButton}
                    onClick={handleDeleteNode}
                    disabled={selectedId === page.root.id}
                  >
                    删除
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.empty}>选择节点以编辑属性</div>
          )}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Tokens</div>
            <div className={styles.tokenList}>
              {Object.entries(page.tokens.colors).map(([key, value]) => (
                <div key={key} className={styles.tokenRow}>
                  <span>{`$colors.${key}`}</span>
                  <span>{value}</span>
                </div>
              ))}
              {Object.entries(page.tokens.space).map(([key, value]) => (
                <div key={key} className={styles.tokenRow}>
                  <span>{`$space.${key}`}</span>
                  <span>{value}px</span>
                </div>
              ))}
              {Object.entries(page.tokens.fontSizes).map(([key, value]) => (
                <div key={key} className={styles.tokenRow}>
                  <span>{`$fontSizes.${key}`}</span>
                  <span>{value}px</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TreeView({
  node,
  level,
  selectedId,
  onSelect,
}: {
  node: Node;
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <button
        className={`${styles.treeItem} ${
          selectedId === node.id ? styles.treeItemActive : ""
        }`}
        style={{ paddingLeft: 12 + level * 14 }}
        onClick={() => onSelect(node.id)}
      >
        <span className={styles.treeType}>{node.type}</span>
        <span>{node.id}</span>
      </button>
      {node.children?.map((child) => (
        <TreeView
          key={child.id}
          node={child}
          level={level + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
