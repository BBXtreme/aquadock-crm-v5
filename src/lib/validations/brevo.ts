// src/lib/validations/brevo.ts
import { z } from "zod";

export const brevoCampaignSchema = z.object({
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  htmlContent: z.string().trim().min(1),
  /** UI may send empty when using recipient selection only; server enforces list OR recipients. */
  listIds: z.array(z.number()).default([]),
  selectedTemplate: z.string().optional(),
  scheduledAt: z.string().optional(),
}).strict();

/** Parsed from FormData `selectedRecipients` JSON (contact UUIDs). */
export const brevoSelectedRecipientsSchema = z.array(z.string().uuid());

export const brevoSyncSchema = z.object({
  filterKundentyp: z.string().optional(),
  filterStatus: z.string().optional(),
}).strict();

export type BrevoCampaignFormData = z.infer<typeof brevoCampaignSchema>;
export type BrevoSyncFormData = z.infer<typeof brevoSyncSchema>;