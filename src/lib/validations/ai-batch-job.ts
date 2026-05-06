import { z } from "zod";

/** Known batch job kinds — extend as features ship. */
export const aiBatchJobTypeSchema = z.enum(["xai_batch_enrichment", "re_embed_companies"]);

export type AiBatchJobType = z.infer<typeof aiBatchJobTypeSchema>;

/** Loose payload envelope — callers narrow per job_type on read. */
export const aiBatchJobPayloadSchema = z.record(z.string(), z.unknown());

export const aiBatchJobInsertPayloadSchema = z
  .object({
    job_type: aiBatchJobTypeSchema,
    payload: aiBatchJobPayloadSchema.optional(),
  })
  .strict();

export type AiBatchJobInsertPayload = z.infer<typeof aiBatchJobInsertPayloadSchema>;
