import assert from "node:assert/strict";
import { buildImagePrompts } from "../lib/promptBuilder.js";

const userInput =
  "生成一只叫 Candice 的博美小狗温馨故事（2岁宝宝），需要配图英文单页展示";

const imagePrompts = [
  { id: "hero-image", prompt: "主视觉" },
  { id: "story-1", prompt: "故事开端" },
  { id: "story-2", prompt: "故事发展" },
  { id: "story-3", prompt: "故事结尾" },
];

const { prompts, debug } = buildImagePrompts({
  userInput,
  imagePrompts,
  debug: true,
});

assert.equal(prompts.length, 4);
assert.ok(prompts.every((p) => p.prompt && p.prompt.length > 80));
assert.ok(debug.length === 4);
assert.ok(prompts.every((p) => p.prompt.includes("博美")));

console.log("Preset:", prompts[0].preset);
console.log("Prompt 1:", prompts[0].prompt);
console.log("Prompt 2:", prompts[1].prompt);
console.log("Prompt 3:", prompts[2].prompt);
console.log("Prompt 4:", prompts[3].prompt);
