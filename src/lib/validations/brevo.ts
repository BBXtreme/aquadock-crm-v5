// src/lib/validations/brevo.ts
import { z } from "zod";

export const brevoCampaignSchema = z.object({
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  htmlContent: z.string().trim().min(1),
  listIds: z.array(z.number()).min(1),
}).strict();

export const brevoSyncSchema = z.object({
  filterKundentyp: z.string().optional(),
  filterStatus: z.string().optional(),
}).strict();

export const brevoSettingsSchema = z.object({
  apiKey: z.string().trim().min(1),
  defaultListId: z.string().uuid().optional(),
  enabled: z.boolean(),
}).strict();

export type BrevoCampaignForm = z.infer<typeof brevoCampaignSchema>;
export type BrevoSyncForm = z.infer<typeof brevoSyncSchema>;
export type BrevoSettingsForm = z.infer<typeof brevoSettingsSchema>;
