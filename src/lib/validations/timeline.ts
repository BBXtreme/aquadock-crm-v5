// src/lib/validations/timeline.ts
// Zod schema for manual Timeline entries

import { z } from "zod";
import type { TimelineEntryInsert } from "@/types/database.types";

export const timelineSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  activity_type: z.string().min(1).trim(),
  content: z.string().max(2000).nullable().optional(),
  company_id: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  user_name: z.string().optional(),
});

export type TimelineFormValues = z.infer<typeof timelineSchema>;

export const toTimelineInsert = (values: TimelineFormValues): TimelineEntryInsert => ({
  ...values,
  content: values.content || null,
  company_id: values.company_id || null,
  contact_id: values.contact_id || null,
});