import { z } from "zod";

export type StyleValue = string | number;

export type StyleProps = {
  padding?: StyleValue;
  margin?: StyleValue;
  fontSize?: StyleValue;
  color?: string;
  backgroundColor?: string;
  display?: string;
  flexDirection?: string;
  gap?: StyleValue;
  alignItems?: string;
  justifyContent?: string;
  borderRadius?: StyleValue;
  borderWidth?: StyleValue;
  borderColor?: string;
  width?: StyleValue;
  height?: StyleValue;
  textAlign?: string;
};

export type TokenSet = {
  colors: Record<string, string>;
  space: Record<string, number>;
  fontSizes: Record<string, number>;
};

export type BaseNode = {
  id: string;
  style?: StyleProps;
  children?: Node[];
};

export type ContainerNode = BaseNode & {
  type: "container";
  props?: { tag?: "section" | "div" };
};

export type TextNode = BaseNode & {
  type: "text";
  props: { text: string; tag?: "p" | "h1" | "h2" | "h3" | "span" };
};

export type ButtonNode = BaseNode & {
  type: "button";
  props: { text: string };
};

export type LinkNode = BaseNode & {
  type: "link";
  props: { text: string; href: string };
};

export type ImageNode = BaseNode & {
  type: "image";
  props: { src: string; alt?: string };
};

export type Node = ContainerNode | TextNode | ButtonNode | LinkNode | ImageNode;

export type PageDSL = {
  id: string;
  title: string;
  tokens: TokenSet;
  root: Node;
};

const StyleValueSchema = z.union([z.string(), z.number()]);

export const StyleSchema = z.object({
  padding: StyleValueSchema.optional(),
  margin: StyleValueSchema.optional(),
  fontSize: StyleValueSchema.optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  display: z.string().optional(),
  flexDirection: z.string().optional(),
  gap: StyleValueSchema.optional(),
  alignItems: z.string().optional(),
  justifyContent: z.string().optional(),
  borderRadius: StyleValueSchema.optional(),
  borderWidth: StyleValueSchema.optional(),
  borderColor: z.string().optional(),
  width: StyleValueSchema.optional(),
  height: StyleValueSchema.optional(),
  textAlign: z.string().optional(),
});

const BaseNodeSchema = z.object({
  id: z.string().min(1),
  style: StyleSchema.optional(),
});

const ContainerNodeSchema = BaseNodeSchema.extend({
  type: z.literal("container"),
  props: z.object({ tag: z.enum(["section", "div"]).optional() }).optional(),
  children: z.array(z.lazy(() => NodeSchema)).optional(),
});

const TextNodeSchema = BaseNodeSchema.extend({
  type: z.literal("text"),
  props: z.object({
    text: z.string(),
    tag: z.enum(["p", "h1", "h2", "h3", "span"]).optional(),
  }),
});

const ButtonNodeSchema = BaseNodeSchema.extend({
  type: z.literal("button"),
  props: z.object({ text: z.string() }),
});

const LinkNodeSchema = BaseNodeSchema.extend({
  type: z.literal("link"),
  props: z.object({ text: z.string(), href: z.string() }),
});

const ImageNodeSchema = BaseNodeSchema.extend({
  type: z.literal("image"),
  props: z.object({ src: z.string(), alt: z.string().optional() }),
});

export const NodeSchema: z.ZodType<Node> = z.discriminatedUnion("type", [
  ContainerNodeSchema,
  TextNodeSchema,
  ButtonNodeSchema,
  LinkNodeSchema,
  ImageNodeSchema,
]) as z.ZodType<Node>;

export const TokenSchema = z.object({
  colors: z.record(z.string(), z.string()),
  space: z.record(z.string(), z.number()),
  fontSizes: z.record(z.string(), z.number()),
});

export const PageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tokens: TokenSchema,
  root: NodeSchema,
});

export function createDefaultPage(): PageDSL {
  return {
    id: "default",
    title: "Web Builder",
    tokens: {
      colors: {
        background: "#0b0f1f",
        surface: "#121826",
        primary: "#8b5cf6",
        text: "#e2e8f0",
        muted: "#94a3b8",
      },
      space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
      fontSizes: { sm: 12, base: 16, lg: 20, xl: 28, xxl: 36 },
    },
    root: {
      id: "root",
      type: "container",
      props: { tag: "section" },
      style: {
        padding: "$space.lg",
        backgroundColor: "$colors.background",
        color: "$colors.text",
      },
      children: [
        {
          id: "hero-title",
          type: "text",
          props: { text: "Web Builder", tag: "h1" },
          style: { fontSize: "$fontSizes.xxl", margin: "$space.md" },
        },
        {
          id: "hero-subtitle",
          type: "text",
          props: { text: "Schema-first page builder", tag: "p" },
          style: { fontSize: "$fontSizes.base", color: "$colors.muted" },
        },
        {
          id: "hero-cta",
          type: "button",
          props: { text: "Get Started" },
          style: {
            margin: "$space.md",
            padding: "$space.sm",
            backgroundColor: "$colors.primary",
            color: "#0b0f1f",
            borderRadius: 8,
          },
        },
      ],
    },
  };
}
