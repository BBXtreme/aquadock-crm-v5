// src/lib/validations/reminder.ts
// Zod schema for Reminder forms – CRM v5 standard

import { z } from "zod";
import type { ReminderInsert, ReminderUpdate } from "@/types/database.types";

export const reminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company_id: z.string().min(1, "Company is required"),
  due_date: z.string().min(1, "Due date is required").refine((val) => {
    const date = new Date(val);
    return date > new Date();
  }, "Due date must be in the future"),
  priority: z.string().optional(),
  status: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  description: z.string().optional(),
});

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

  assigned_to: z.string().uuid("Ungültige Benutzer-ID").nullable().optional(),
}).strict();

export type ReminderFormValues = z.infer<typeof reminderSchema>;

// Conversion helpers
export const toReminderInsert = (values: ReminderFormValues): ReminderInsert => ({
  ...values,
  due_date: new Date(values.due_date).toISOString(),
  description: values.description || null,
  assigned_to: values.assigned_to || null,
});

export const toReminderUpdate = (values: ReminderFormValues): ReminderUpdate => ({
  ...values,
  due_date: new Date(values.due_date).toISOString(),
  description: values.description || null,
  assigned_to: values.assigned_to || null,
});

export type ReminderForm = z.infer<typeof reminderFormSchema>;
