// src/lib/validations/reminder.ts
// Zod schema for Reminder forms – CRM v5 standard

import { z } from "zod";
import type { ReminderInsert, ReminderUpdate } from "@/types/database.types";

export const reminderSchema = z.object({
  title: z
    .string({ required_error: "Titel ist erforderlich" })
    .min(3, "Titel muss mindestens 3 Zeichen lang sein")
    .max(200, "Titel darf maximal 200 Zeichen lang sein")
    .trim(),

  description: z.string().trim().max(2000).nullable().optional(),

  due_date: z
    .string({ required_error: "Fälligkeitsdatum ist erforderlich" })
    .pipe(z.coerce.date())
    .refine((date) => date > new Date(), "Fälligkeitsdatum muss in der Zukunft liegen"),

  priority: z.enum(["low", "medium", "high"], {
    required_error: "Priorität ist erforderlich",
  }),

  status: z.enum(["open", "in_progress", "completed", "cancelled"]).default("open"),

  company_id: z.string({ required_error: "Zugehöriges Unternehmen ist erforderlich" }),

  assigned_to: z.string().nullable().optional(),
});

export type ReminderFormValues = z.infer<typeof reminderSchema>;

// Conversion helpers
export const toReminderInsert = (values: ReminderFormValues): ReminderInsert => ({
  ...values,
  due_date: values.due_date.toISOString(),
  description: values.description || null,
  assigned_to: values.assigned_to || null,
});

export const toReminderUpdate = (values: ReminderFormValues): ReminderUpdate => ({
  ...values,
  due_date: values.due_date.toISOString(),
  description: values.description || null,
  assigned_to: values.assigned_to || null,
});