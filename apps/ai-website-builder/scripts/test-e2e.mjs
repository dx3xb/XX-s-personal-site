const API_BASE = process.env.API_BASE_URL || "http://localhost:3001/api/gen-ai-code";

const longText = Array.from({ length: 30 })
  .map((_, idx) => `段落${idx + 1}：包含丰富内容的测试段落，用于验证页面结构与图片配置。`)
  .join("\n\n");

async function main() {
  const messages = [{ role: "user", content: longText }];
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: JSON.stringify(messages) }),
  });
  const data = await res.json();
  const payload = data.sitePayload;
  if (!payload) {
    throw new Error("sitePayload missing");
  }

  const blocks = payload.sections.flatMap((section) => section.blocks || []);
  const missingImages = blocks.filter((block) => !block.images || block.images.length === 0);

  const bookBlocks = blocks.filter((block) => block.component === "BookGrid");
  const missingBooks = bookBlocks.filter((block) => !block.books || block.books.length === 0);

  const videoBlocks = blocks.filter((block) => block.component === "VideoStack");
  const missingVideos = videoBlocks.filter((block) => !block.video);

  console.log("Blocks total:", blocks.length);
  console.log("Blocks missing images:", missingImages.length);
  console.log("Book blocks missing books:", missingBooks.length);
  console.log("Video blocks missing video:", missingVideos.length);

  if (missingImages.length || missingBooks.length || missingVideos.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
