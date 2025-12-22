import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { PageSchema, type PageDSL } from "./dsl";

const StoreSchema = z.object({
  pages: z.array(PageSchema),
  updatedAt: z.string().optional(),
});

type StoreData = z.infer<typeof StoreSchema>;

function getStorePath() {
  return path.join(process.cwd(), "data", "web-builder-pages.json");
}

async function ensureStoreDir() {
  const dir = path.dirname(getStorePath());
  await fs.mkdir(dir, { recursive: true });
}

async function readStore(): Promise<StoreData> {
  await ensureStoreDir();
  try {
    const raw = await fs.readFile(getStorePath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = StoreSchema.safeParse(parsed);
    if (result.success) return result.data;
    return { pages: [] };
  } catch {
    return { pages: [] };
  }
}

async function writeStore(store: StoreData) {
  await ensureStoreDir();
  await fs.writeFile(getStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listPages() {
  const store = await readStore();
  return store.pages.map((page) => ({
    id: page.id,
    title: page.title,
  }));
}

export async function getPage(id: string) {
  const store = await readStore();
  return store.pages.find((page) => page.id === id) ?? null;
}

export async function savePage(page: PageDSL) {
  const parsed = PageSchema.parse(page);
  const store = await readStore();
  const nextPages = store.pages.filter((p) => p.id !== parsed.id);
  nextPages.push(parsed);
  await writeStore({
    pages: nextPages,
    updatedAt: new Date().toISOString(),
  });
  return parsed;
}

export async function deletePage(id: string) {
  const store = await readStore();
  const nextPages = store.pages.filter((page) => page.id !== id);
  await writeStore({
    pages: nextPages,
    updatedAt: new Date().toISOString(),
  });
  return true;
}
