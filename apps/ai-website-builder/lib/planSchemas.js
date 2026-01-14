import { z } from "zod";

export const SourceRangeSchema = z.object({
  start_pid: z.number().int().nonnegative(),
  end_pid: z.number().int().nonnegative(),
});

export const StructureBlockSchema = z.object({
  block_id: z.string(),
  type: z.string(),
  source_range: SourceRangeSchema,
  hints: z.string().optional(),
});

export const StructurePlanSchema = z.object({
  site_title: z.string().optional(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      blocks: z.array(StructureBlockSchema),
    })
  ),
});

export const LayoutPlanSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      layout: z.string().optional(),
      blocks: z.array(
        z.object({
          block_id: z.string(),
          component: z.string(),
          props_schema: z.any().optional(),
        })
      ),
    })
  ),
});

export const AssetPlanSchema = z.object({
  images: z.array(
    z.object({
      asset_id: z.string(),
      block_id: z.string(),
      scene_id: z.string().optional(),
      summary: z.string(),
      style_anchor: z.string().optional(),
      negative: z.string().optional(),
    })
  ),
  videos: z
    .array(
      z.object({
        block_id: z.string(),
        query_or_url: z.string(),
        layout: z.string(),
      })
    )
    .optional(),
  books: z
    .array(
      z.object({
        block_id: z.string().optional(),
        title: z.string(),
        author: z.string(),
        blurb: z.string(),
        cover_query: z.string(),
      })
    )
    .optional(),
});
