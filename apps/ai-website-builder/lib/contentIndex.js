import { splitToParagraphs } from "./chunking.js";

function sanitizeTitle(text) {
  return text.replace(/[\\s，。！？!?、；;:：]/g, "");
}

export function buildContentIndex(paragraphs) {
  const list = paragraphs.map((text, idx) => {
    const preview = text.slice(0, 36);
    return {
      pid: idx,
      text,
      preview,
      char_count: text.length,
    };
  });
  const toc = list.map((item) => ({
    pid: item.pid,
    title_guess: sanitizeTitle(item.preview).slice(0, 18) || `段落 ${item.pid + 1}`,
  }));
  return {
    total_paragraphs: list.length,
    paragraphs: list,
    toc,
  };
}

export function buildIndexFromText(text) {
  const paragraphs = splitToParagraphs(text);
  return buildContentIndex(paragraphs);
}
