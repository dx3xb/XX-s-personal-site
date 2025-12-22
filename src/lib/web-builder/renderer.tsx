import React from "react";
import type { CSSProperties } from "react";
import type { Node, PageDSL, StyleProps, TokenSet } from "./dsl";

type RendererProps = {
  page: PageDSL;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

type NodeRendererProps = {
  node: Node;
  tokens: TokenSet;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

function resolveToken(tokens: TokenSet, value: string) {
  if (!value.startsWith("$")) return value;
  const path = value.slice(1).split(".");
  const [group, key] = path;
  if (!group || !key) return value;
  if (group === "colors") return tokens.colors[key] ?? value;
  if (group === "space") return tokens.space[key] ?? value;
  if (group === "fontSizes") return tokens.fontSizes[key] ?? value;
  return value;
}

function resolveStyleValue(tokens: TokenSet, value: string | number) {
  if (typeof value === "string") {
    const resolved = resolveToken(tokens, value);
    return resolved;
  }
  return value;
}

function buildStyle(tokens: TokenSet, style?: StyleProps): CSSProperties {
  if (!style) return {};
  const entries = Object.entries(style).map(([key, value]) => [
    key,
    resolveStyleValue(tokens, value as string | number),
  ]);
  return Object.fromEntries(entries) as CSSProperties;
}

function withSelectionStyle(
  baseStyle: CSSProperties,
  selected: boolean
): CSSProperties {
  if (!selected) return baseStyle;
  return {
    ...baseStyle,
    outline: "1px solid rgba(56, 189, 248, 0.9)",
    outlineOffset: 2,
  };
}

function NodeRenderer({
  node,
  tokens,
  selectedId,
  onSelect,
}: NodeRendererProps) {
  const selected = node.id === selectedId;
  const style = withSelectionStyle(buildStyle(tokens, node.style), selected);
  const handleSelect = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect?.(node.id);
  };

  switch (node.type) {
    case "container": {
      const Tag = node.props?.tag ?? "div";
      return (
        <Tag style={style} onClick={handleSelect}>
          {node.children?.map((child) => (
            <NodeRenderer
              key={child.id}
              node={child}
              tokens={tokens}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </Tag>
      );
    }
    case "text": {
      const Tag = node.props.tag ?? "p";
      return (
        <Tag style={style} onClick={handleSelect}>
          {node.props.text}
        </Tag>
      );
    }
    case "button":
      return (
        <button style={style} onClick={handleSelect}>
          {node.props.text}
        </button>
      );
    case "link":
      return (
        <a style={style} onClick={handleSelect} href={node.props.href}>
          {node.props.text}
        </a>
      );
    case "image":
      return (
        <img
          style={style}
          onClick={handleSelect}
          src={node.props.src}
          alt={node.props.alt ?? ""}
        />
      );
    default:
      return null;
  }
}

export function PageRenderer({ page, selectedId, onSelect }: RendererProps) {
  return (
    <NodeRenderer
      node={page.root}
      tokens={page.tokens}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
