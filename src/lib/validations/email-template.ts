// src/lib/validations/email-template.ts
// Zod schema for Email Template forms – CRM v5 standard

import { z } from "zod";
import type { EmailTemplateInsert, EmailTemplateUpdate } from "@/types/database.types";

export const emailTemplateSchema = z.object({
  name: z
    .string({ required_error: "Name ist erforderlich" })
    .trim()
    .min(1, "Name ist erforderlich")
    .max(200, "Name darf maximal 200 Zeichen lang sein"),
  subject: z
    .string({ required_error: "Betreff ist erforderlich" })
    .trim()
    .min(1, "Betreff ist erforderlich")
    .max(500, "Betreff darf maximal 500 Zeichen lang sein"),
  body: z
    .string({ required_error: "Inhalt ist erforderlich" })
    .trim()
    .min(1, "Inhalt ist erforderlich")
    .max(20000, "Inhalt darf maximal 20000 Zeichen lang sein"),
}).strict();

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

// Conversion helpers
export const toEmailTemplateInsert = (values: EmailTemplateFormValues): EmailTemplateInsert => ({
  ...values,
});

export const toEmailTemplateUpdate = (values: EmailTemplateFormValues): EmailTemplateUpdate => ({
  ...values,
});

function _emptyStringToNull(val: unknown) {
  return val === "" ? null : val;
}

export type EmailTemplateForm = z.infer<typeof emailTemplateSchema>;
