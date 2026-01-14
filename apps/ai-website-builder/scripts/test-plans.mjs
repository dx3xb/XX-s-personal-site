import { StructurePlanSchema, LayoutPlanSchema, AssetPlanSchema } from "../lib/planSchemas.js";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3001/api/gen-ai-code";

const longText = Array.from({ length: 60 })
  .map((_, idx) => `第${idx + 1}段：这是用于测试的长文本内容，描述了丰富的细节与结构化需求。`)
  .join("\n\n");

async function main() {
  const messages = [{ role: "user", content: longText }];
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: JSON.stringify(messages) }),
  });
  const data = await res.json();

  const structure = data.structure_plan;
  const layout = data.layout_plan;
  const asset = data.asset_plan;

  const structureResult = structure ? StructurePlanSchema.safeParse(structure) : null;
  const layoutResult = layout ? LayoutPlanSchema.safeParse(layout) : null;
  const assetResult = asset ? AssetPlanSchema.safeParse(asset) : null;

  console.log("StructurePlan:", structureResult ? structureResult.success : "missing");
  console.log("LayoutPlan:", layoutResult ? layoutResult.success : "missing");
  console.log("AssetPlan:", assetResult ? assetResult.success : "missing");

  if (structureResult && !structureResult.success) {
    console.error(structureResult.error.format());
  }
  if (layoutResult && !layoutResult.success) {
    console.error(layoutResult.error.format());
  }
  if (assetResult && !assetResult.success) {
    console.error(assetResult.error.format());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
