import { z } from "zod";

export const speedTierSchema = z.enum(["low", "medium", "high"]);
export const costTierSchema = z.enum(["low", "medium", "high"]);
export const badgeVariantSchema = z.enum(["default", "secondary", "outline"]);

export const aiModelInsertSchema = z
  .object({
    gateway_id: z.string().min(1).trim(),
    label: z.string().min(1).trim(),
    provider: z.string().min(1).trim(),
    quality_score: z.number().int().min(1).max(5),
    speed_tier: speedTierSchema,
    cost_tier: costTierSchema,
    badge_text: z.string().trim().optional().nullable(),
    badge_variant: badgeVariantSchema.optional().nullable(),
    recommended_for: z.array(z.literal("company-research")).default(["company-research"]),
    is_enabled: z.boolean().default(true),
  })
  .strict();

export const aiModelUpdateSchema = aiModelInsertSchema.partial().strict();

export type AiModelInsert = z.infer<typeof aiModelInsertSchema>;
export type AiModelUpdate = z.infer<typeof aiModelUpdateSchema>;