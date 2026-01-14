import { normalizeText, splitToParagraphs, chunkParagraphs } from "../lib/chunking.js";
import { buildContentIndex } from "../lib/contentIndex.js";

const base = "这是一个测试段落，用于验证分页与目录索引构建。";
const longText = Array.from({ length: 240 }, (_, i) => `${base}编号${i + 1}。`).join("\n\n");

const normalized = normalizeText(longText);
const paragraphs = splitToParagraphs(normalized);
const contentIndex = buildContentIndex(paragraphs);
const chunks = chunkParagraphs(paragraphs, { maxCharsPerChunk: 1800, overlap: 1 });

const tocPreview = contentIndex.toc.slice(0, 10).map((t) => t.title_guess);

console.log("Paragraphs:", paragraphs.length);
console.log("Chunks:", chunks.length);
console.log("TOC sample:", tocPreview);
