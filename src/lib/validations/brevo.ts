// src/lib/validations/brevo.ts
import { z } from "zod";

export const brevoCampaignSchema = z
  .object({
    name: z.string().trim().min(1),
    subject: z.string().optional().default(""),
    htmlContent: z.string().optional().default(""),
    /** UI may send empty when using recipient selection only; server enforces list OR recipients. */
    listIds: z.array(z.number()).default([]),
    selectedTemplate: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().uuid().optional(),
    ),
    scheduledAt: z.string().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasTemplate = Boolean(data.selectedTemplate);
    if (hasTemplate) return;
    const subject = (data.subject ?? "").trim();
    if (subject.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Betreff ist erforderlich, wenn keine Vorlage gewählt ist.",
        path: ["subject"],
      });
    }
    const html = (data.htmlContent ?? "").trim();
    if (html.length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Der HTML-Inhalt muss mindestens 20 Zeichen lang sein (Leerzeichen am Anfang und Ende werden nicht mitgezählt).",
        path: ["htmlContent"],
      });
    }
  });

/** Parsed from FormData `selectedRecipients` JSON (contact UUIDs). */
export const brevoSelectedRecipientsSchema = z.array(z.string().uuid());

export const brevoSyncSchema = z.object({
  filterKundentyp: z.string().optional(),
  filterStatus: z.string().optional(),
}).strict();

export type BrevoCampaignFormData = z.infer<typeof brevoCampaignSchema>;
export type BrevoSyncFormData = z.infer<typeof brevoSyncSchema>;
