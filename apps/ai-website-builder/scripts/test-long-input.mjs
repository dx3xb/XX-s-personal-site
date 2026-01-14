import assert from "node:assert/strict";
import { normalizeText, splitToParagraphs, chunkParagraphs } from "../lib/chunking.js";
import { buildContentIndex } from "../lib/contentIndex.js";

const para = "这是一个测试段落，用于验证长文本分块与索引构建能力。";
const longText = Array.from({ length: 420 }, (_, i) => `${para}编号${i + 1}。`).join("\n\n");

const normalized = normalizeText(longText);
const paragraphs = splitToParagraphs(normalized);
const chunks = chunkParagraphs(paragraphs, { maxCharsPerChunk: 1800, overlap: 1 });
const index = buildContentIndex(paragraphs);

assert.ok(paragraphs.length > 200);
assert.ok(chunks.length > 5);
assert.equal(index.paragraphs.length, paragraphs.length);
assert.ok(index.toc.length === paragraphs.length);

const totalChars = paragraphs.reduce((sum, p) => sum + p.length, 0);
console.log("Paragraphs:", paragraphs.length);
console.log("Chunks:", chunks.length);
console.log("Total chars:", totalChars);
