import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreatePipelineJob = mutation({
  args: {
    workspaceId: v.id("workspace"),
    userInput: v.string(),
    stages: v.any(),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("pipelineJobs", {
      workspaceId: args.workspaceId,
      userInput: args.userInput,
      stages: args.stages,
      currentStage: 0,
      status: "running",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return jobId;
  },
});

export const GetPipelineJob = query({
  args: { jobId: v.id("pipelineJobs") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.jobId);
  },
});

export const UpdatePipelineJob = mutation({
  args: {
    jobId: v.id("pipelineJobs"),
    stages: v.any(),
    currentStage: v.number(),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      stages: args.stages,
      currentStage: args.currentStage,
      status: args.status,
      error: args.error,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const ResetPipelineStage = mutation({
  args: {
    jobId: v.id("pipelineJobs"),
    stageId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const stages = job.stages || [];
    const nextStages = stages.map((stage) =>
      stage.id === args.stageId
        ? { ...stage, status: "pending", error: null, output: null }
        : stage
    );
    await ctx.db.patch(args.jobId, {
      stages: nextStages,
      status: "running",
      updatedAt: Date.now(),
    });
    return true;
  },
});
