// src/lib/validations/reminder.ts
// Zod schema for Reminder forms – CRM v5 standard

import { z } from "zod";
import type { ReminderInsert, ReminderUpdate } from "@/types/database.types";

export const reminderFormSchema = z.object({
  title: z
    .string({ required_error: "Titel ist erforderlich" })
    .trim()
    .min(3, "Titel muss mindestens 3 Zeichen lang sein")
    .max(200, "Titel darf maximal 200 Zeichen lang sein"),

  description: z.string().trim().max(2000, "Beschreibung darf maximal 2000 Zeichen lang sein").nullable().optional(),

  due_date: z
    .string({ required_error: "Fälligkeitsdatum ist erforderlich" })
    .pipe(z.coerce.date({ errorMap: () => ({ message: "Ungültiges Datum" }) }))
    .refine((date) => date > new Date(), "Fälligkeitsdatum muss in der Zukunft liegen"),

  priority: z.enum(["hoch", "normal", "niedrig"], {
    required_error: "Priorität ist erforderlich",
  }).nullable().optional(),

  status: z.enum(["open", "closed"], {
    required_error: "Status ist erforderlich",
  }).nullable().optional(),

  company_id: z.string({ required_error: "Zugehöriges Unternehmen ist erforderlich" }).uuid("Ungültige Unternehmens-ID"),

  assigned_to: z.string().trim().max(100, "Zugewiesen an darf maximal 100 Zeichen lang sein").nullable().optional(),
}).strict();

export type ReminderFormValues = z.infer<typeof reminderFormSchema>;

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

function _emptyStringToNull(val: unknown) {
  return val === "" ? null : val;
}

export type ReminderForm = z.infer<typeof reminderFormSchema>;
