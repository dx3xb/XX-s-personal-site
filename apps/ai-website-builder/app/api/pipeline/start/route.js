import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

const STAGES = [
  "constraints",
  "sitemap",
  "layout_plan",
  "image_plan",
  "content_blocks",
  "codegen_assemble",
];

function buildStageList() {
  return STAGES.map((id) => ({
    id,
    status: "pending",
    output: null,
    error: null,
    startedAt: null,
    completedAt: null,
  }));
}

export async function POST(req) {
  const body = await req.json();
  const { workspaceId, userInput } = body || {};
  if (!workspaceId || !userInput) {
    return NextResponse.json(
      { ok: false, error: "workspaceId and userInput required" },
      { status: 400 }
    );
  }
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { ok: false, error: "Convex URL not configured" },
      { status: 500 }
    );
  }
  const client = new ConvexHttpClient(convexUrl);
  const stages = buildStageList();
  const jobId = await client.mutation(api.pipeline.CreatePipelineJob, {
    workspaceId,
    userInput,
    stages,
  });
  return NextResponse.json({ ok: true, jobId, stages });
}
