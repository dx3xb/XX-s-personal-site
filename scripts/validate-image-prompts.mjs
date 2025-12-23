import { z } from "zod";

const ImagePromptSchema = z.object({
  id: z.string().min(1),
  usage: z.string().min(1),
  prompt: z.string().min(80),
  negative_prompt: z.string().optional().nullable(),
  style: z.string().min(1),
  aspect_ratio: z.string().min(1),
  size: z.string().min(1),
  seed: z.number().int().optional().nullable(),
});

const PayloadSchema = z.object({
  images: z.array(ImagePromptSchema).min(1),
});

const sample = {
  images: [
    {
      id: "hero-image",
      usage: "页面主视觉",
      prompt:
        "A children's picture book illustration featuring a female baby snake with a tiny bit of hair, standing in a soft pastel meadow at sunrise. The scene is warm and gentle, with friendly expression, clean shapes, soft diffused lighting, and a wide composition suitable for toddlers. No text in image, no fear, kid-safe.",
      negative_prompt: "scary, violent, text, watermark",
      style: "children_book_illustration",
      aspect_ratio: "16:9",
      size: "1024x576",
      seed: null,
    },
    {
      id: "start-image",
      usage: "故事开始",
      prompt:
        "A children's picture book illustration of a female baby snake with a tiny bit of hair preparing to explore, wearing a small scarf, surrounded by gentle forest friends. Warm, wise, toddler-friendly tone, soft pastel colors, clean shapes, soft diffused lighting, wide shot composition. No text, no violence, no fear.",
      negative_prompt: "scary, violent, text, watermark",
      style: "children_book_illustration",
      aspect_ratio: "16:9",
      size: "1024x576",
      seed: null,
    },
    {
      id: "middle-image",
      usage: "故事发展",
      prompt:
        "A children's picture book illustration showing a female baby snake with a tiny bit of hair solving a small problem, like crossing a tiny stream with a leaf bridge. Warm and gentle mood, soft pastel palette, clear focal point, medium shot composition, soft diffused light. No text, no violence, no fear.",
      negative_prompt: "scary, violent, text, watermark",
      style: "children_book_illustration",
      aspect_ratio: "16:9",
      size: "1024x576",
      seed: null,
    },
    {
      id: "end-image",
      usage: "故事结尾",
      prompt:
        "A children's picture book illustration of a female baby snake with a tiny bit of hair returning happily at sunset, holding a small leaf treasure, with a gentle smile. Warm, wise, toddler-safe tone, soft pastel colors, clean shapes, wide shot composition, soft diffused lighting. No text, no fear, no violence.",
      negative_prompt: "scary, violent, text, watermark",
      style: "children_book_illustration",
      aspect_ratio: "16:9",
      size: "1024x576",
      seed: null,
    },
  ],
};

const result = PayloadSchema.safeParse(sample);
if (!result.success) {
  console.error("Validation failed", result.error.format());
  process.exit(1);
}

const mustPhrase = /female baby snake with a tiny bit of hair/i;
const missing = sample.images.filter((img) => !mustPhrase.test(img.prompt));
if (missing.length) {
  console.error("Missing required phrase in:", missing.map((m) => m.id));
  process.exit(1);
}

console.log("OK: prompt schema + required phrase checks passed");
