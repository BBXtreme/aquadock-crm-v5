// src/lib/validations/timeline.ts
// Zod schema for manual Timeline entries

import { z } from "zod";
import type { TimelineEntryInsert } from "@/types/database.types";

export const timelineSchema = z.object({
  title: z.string().min(3, "Titel muss mindestens 3 Zeichen lang sein").max(200, "Titel darf maximal 200 Zeichen lang sein").trim(),
  activity_type: z.enum(["note", "call", "email", "meeting", "reminder", "other"], { required_error: "Aktivitätstyp ist erforderlich" }),
  content: z.string().max(2000, "Inhalt darf maximal 2000 Zeichen lang sein").nullable().optional(),
  company_id: z.string().uuid("Ungültige Unternehmens-ID").nullable().optional(),
  contact_id: z.string().uuid("Ungültige Kontakt-ID").nullable().optional(),
  user_name: z.string().optional(),
}).strict();

export type TimelineFormValues = z.infer<typeof timelineSchema>;

export const toTimelineInsert = (values: TimelineFormValues): TimelineEntryInsert => ({
  ...values,
  content: values.content || null,
  company_id: values.company_id || null,
  contact_id: values.contact_id || null,
});

export type TimelineForm = z.infer<typeof timelineSchema>;
