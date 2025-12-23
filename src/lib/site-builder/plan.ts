import { z } from "zod";

export type ImageSlot = {
  id: string;
  usage: string;
  section: string;
  module_id?: string;
  item_id?: string;
};

export type RawImageSlot = {
  id: string;
  usage: string;
  section?: string;
  module_id?: string;
  item_id?: string;
};

export type ModuleItem = {
  id: string;
  title: string;
  text_ref: string;
};

export type PageModule = {
  id: string;
  title: string;
  type: string;
  text_ref: string;
  items?: ModuleItem[];
};

export type RawPagePlan = {
  page_title?: string;
  audience?: string;
  tone?: string;
  content_outline?: {
    begin?: string;
    middle?: string;
    end?: string;
  };
  modules?: PageModule[];
  image_slots?: RawImageSlot[];
  suggested_image_count?: number;
};

export type ProjectSpec = {
  project_id: string;
  user_prompt: string;
  page_plan: PagePlan;
  image_plan?: ImagePlan;
};

export type PagePlan = {
  page_title: string;
  audience: string;
  tone: string;
  content_outline: {
    begin: string;
    middle: string;
    end: string;
  };
  modules: PageModule[];
  image_slots: ImageSlot[];
  suggested_image_count?: number;
};

export type ImagePrompt = {
  id: string;
  usage: string;
  section: string;
  prompt: string;
  negative_prompt?: string | null;
  style?: string | null;
  aspect_ratio?: string | null;
  size?: string | null;
  seed?: number | null;
};

export type ImagePlan = {
  images: ImagePrompt[];
};

export const ImageSlotSchema = z.object({
  id: z.string().min(1),
  usage: z.string().min(1),
  section: z.string().min(1).optional(),
  module_id: z.string().optional(),
  item_id: z.string().optional(),
});

export const ModuleItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text_ref: z.string().min(1),
});

export const PageModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  text_ref: z.string().min(1),
  items: z.array(ModuleItemSchema).optional(),
});

export const PagePlanSchema = z.object({
  page_title: z.string().min(1),
  audience: z.string().min(1),
  tone: z.string().min(1),
  content_outline: z.object({
    begin: z.string().min(1),
    middle: z.string().min(1),
    end: z.string().min(1),
  }),
  modules: z.array(PageModuleSchema).optional(),
  image_slots: z.array(ImageSlotSchema),
  suggested_image_count: z.number().int().min(0).optional(),
});

export const ImagePromptSchema = z.object({
  id: z.string().min(1),
  usage: z.string().min(1),
  section: z.string().min(1),
  prompt: z.string().min(1),
  negative_prompt: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  aspect_ratio: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  seed: z.number().int().optional().nullable(),
});

export const ImagePlanSchema = z.object({
  images: z.array(ImagePromptSchema).min(1),
});

export function detectRequestedImageCount(input: string) {
  const text = input.replace(/\s+/g, "");
  const match = text.match(/(\d+)(张|幅|个)?(图|图片|插画|illustrations?|images?)/i);
  if (match?.[1]) return Math.max(1, Number(match[1]));
  if (/两张|二张|两幅|两图/.test(text)) return 2;
  if (/三张|三幅|三图/.test(text)) return 3;
  if (/四张|四幅|四图/.test(text)) return 4;
  if (/五张|五幅|五图/.test(text)) return 5;
  return undefined;
}

function normalizeId(id: string) {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureSection(value: string | undefined, id: string) {
  const raw = (value ?? "").trim();
  if (raw) return raw;
  if (/hero/.test(id)) return "hero";
  if (/start|begin/.test(id)) return "begin";
  if (/middle/.test(id)) return "middle";
  if (/end/.test(id)) return "end";
  return "content";
}

function buildStorySlots(count: number) {
  if (count <= 1) {
    return [{ id: "hero-image", usage: "页面主视觉", section: "hero" }];
  }
  if (count === 2) {
    return [
      { id: "start-image", usage: "故事开端配图", section: "begin" },
      { id: "end-image", usage: "故事结尾配图", section: "end" },
    ];
  }
  if (count === 3) {
    return [
      { id: "start-image", usage: "故事开端配图", section: "begin" },
      { id: "middle-image", usage: "故事发展配图", section: "middle" },
      { id: "end-image", usage: "故事结尾配图", section: "end" },
    ];
  }
  const slots: ImageSlot[] = [
    { id: "hero-image", usage: "页面主视觉", section: "hero" },
    { id: "start-image", usage: "故事开端配图", section: "begin" },
    { id: "middle-image", usage: "故事发展配图", section: "middle" },
    { id: "end-image", usage: "故事结尾配图", section: "end" },
  ];
  for (let i = 4; i <= count; i += 1) {
    slots.push({
      id: `story-image-${i}`,
      usage: `故事补充配图 ${i}`,
      section: "content",
    });
  }
  return slots;
}

function buildDefaultSlots(count: number) {
  if (count <= 1) {
    return [{ id: "hero-image", usage: "页面主视觉", section: "hero" }];
  }
  const slots: ImageSlot[] = [
    { id: "hero-image", usage: "页面主视觉", section: "hero" },
  ];
  for (let i = 1; i <= count - 1; i += 1) {
    slots.push({
      id: `feature-image-${i}`,
      usage: `内容配图 ${i}`,
      section: "content",
    });
  }
  return slots;
}

function buildSlotsFromModules(
  modules: PageModule[],
  wantPerModule: boolean
) {
  const slots: ImageSlot[] = [];
  for (const module of modules) {
    if (wantPerModule) {
      slots.push({
        id: `mod-${module.id}-img`,
        usage: module.title || "模块配图",
        section: "module",
        module_id: module.id,
      });
    }
    if (module.type === "cards" && module.items?.length) {
      for (const item of module.items) {
        slots.push({
          id: `item-${item.id}-img`,
          usage: item.title || "卡片配图",
          section: "item",
          module_id: module.id,
          item_id: item.id,
        });
      }
    }
    if (module.type === "grid" && (module.items?.length ?? 0) >= 4) {
      for (const item of module.items ?? []) {
        slots.push({
          id: `item-${item.id}-img`,
          usage: item.title || "网格配图",
          section: "item",
          module_id: module.id,
          item_id: item.id,
        });
      }
      slots.push({
        id: `grid-${module.id}-overview`,
        usage: module.title || "网格总览",
        section: "module",
        module_id: module.id,
      });
    }
    if (module.type === "video") {
      slots.push({
        id: `video-${module.id}-frame`,
        usage: module.title || "视频配图",
        section: "video",
        module_id: module.id,
      });
    }
    if (module.type === "booklist" && module.items?.length) {
      for (const item of module.items) {
        slots.push({
          id: `book-${item.id}-cover`,
          usage: item.title || "书籍封面",
          section: "book",
          module_id: module.id,
          item_id: item.id,
        });
      }
    }
  }
  return slots;
}

export function normalizePagePlan(
  raw: RawPagePlan,
  userPrompt: string,
  requestedCount?: number
) {
  const isStory = /故事|绘本|童话|宝宝|儿童/.test(userPrompt);
  const wantPerModule = /每个模块至少一张图/.test(userPrompt);
  const normalizedSlots: ImageSlot[] = (raw.image_slots ?? []).map((slot) => {
    const id = normalizeId(slot.id);
    return {
      id: id || "hero-image",
      usage: slot.usage?.trim() || "页面配图",
      section: ensureSection(slot.section, id),
      module_id: slot.module_id,
      item_id: slot.item_id,
    };
  });

  const modules = Array.isArray(raw.modules) ? raw.modules : [];
  const moduleSlots: ImageSlot[] = modules.length
    ? buildSlotsFromModules(modules, wantPerModule)
    : [];

  let slots: ImageSlot[] = normalizedSlots.filter((slot) => slot.id);
  if (!slots.length) {
    const count = requestedCount ?? 1;
    slots = moduleSlots.length
      ? moduleSlots
      : isStory
        ? buildStorySlots(count)
        : buildDefaultSlots(count);
  } else if (requestedCount && slots.length < requestedCount) {
    const desired = isStory
      ? buildStorySlots(requestedCount)
      : buildDefaultSlots(requestedCount);
    const merged = new Map<string, ImageSlot>();
    for (const slot of slots) merged.set(slot.id, slot);
    for (const slot of desired) {
      if (!merged.has(slot.id)) merged.set(slot.id, slot);
    }
    slots = Array.from(merged.values());
  }

  if (moduleSlots.length) {
    const merged = new Map<string, ImageSlot>();
    for (const slot of slots) merged.set(slot.id, slot);
    for (const slot of moduleSlots) {
      if (!merged.has(slot.id)) merged.set(slot.id, slot);
    }
    slots = Array.from(merged.values());
  }

  if (!slots.some((slot) => slot.id === "hero-image")) {
    slots.unshift({
      id: "hero-image",
      usage: "页面主视觉",
      section: "hero",
    });
  }

  return {
    page_title: raw.page_title?.trim() || "Site Builder",
    audience: raw.audience?.trim() || "大众用户",
    tone: raw.tone?.trim() || "清晰、友好、结构化",
    content_outline: {
      begin: raw.content_outline?.begin?.trim() || "故事开始，引出主题。",
      middle: raw.content_outline?.middle?.trim() || "故事发展，呈现关键事件。",
      end: raw.content_outline?.end?.trim() || "故事收束，给出结论或收获。",
    },
    modules,
    image_slots: slots,
    suggested_image_count: slots.length,
  } satisfies PagePlan;
}
