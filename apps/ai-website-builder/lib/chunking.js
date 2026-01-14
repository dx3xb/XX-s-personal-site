export function normalizeText(text) {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitToParagraphs(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const raw = normalized
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (raw.length > 0) return raw;
  return normalized
    .split(/[。！？!?]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function chunkParagraphs(paragraphs, options = {}) {
  const maxCharsPerChunk = options.maxCharsPerChunk || 1800;
  const overlap = options.overlap || 1;
  const chunks = [];
  let buffer = "";
  let startIdx = 0;

  paragraphs.forEach((p, idx) => {
    const next = buffer ? `${buffer}\n${p}` : p;
    if (next.length > maxCharsPerChunk && buffer) {
      chunks.push({
        chunk_id: `chunk-${chunks.length + 1}`,
        start_idx: startIdx,
        end_idx: idx - 1,
        text: buffer,
        char_count: buffer.length,
      });
      startIdx = Math.max(0, idx - overlap);
      buffer = paragraphs.slice(startIdx, idx + 1).join("\n");
      return;
    }
    buffer = next;
  });

  if (buffer) {
    chunks.push({
      chunk_id: `chunk-${chunks.length + 1}`,
      start_idx: startIdx,
      end_idx: paragraphs.length - 1,
      text: buffer,
      char_count: buffer.length,
    });
  }

  return chunks;
}
