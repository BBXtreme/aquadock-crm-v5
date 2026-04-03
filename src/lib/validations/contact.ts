// src/lib/validations/contact-val.ts
// This file defines the Zod schema for validating contact data

import { z } from "zod";
import type { ContactInsert, ContactUpdate } from "@/types/database.types";

export const contactSchema = z.object({
  vorname: z.string().min(1, "Vorname ist erforderlich").trim().max(100, "Vorname darf maximal 100 Zeichen lang sein"),
  nachname: z
    .string()
    .min(1, "Nachname ist erforderlich")
    .trim()
    .max(100, "Nachname darf maximal 100 Zeichen lang sein"),
  anrede: z.enum(["Herr", "Frau", "Dr.", "Prof."], { required_error: "Anrede ist erforderlich" }).optional(),
  position: z.string().trim().max(100, "Position darf maximal 100 Zeichen lang sein").optional(),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(320, "E-Mail darf maximal 320 Zeichen lang sein").optional().transform(emptyStringToNull),
  telefon: z.string().trim().max(50, "Telefon darf maximal 50 Zeichen lang sein").optional(),
  mobil: z.string().trim().max(50, "Mobil darf maximal 50 Zeichen lang sein").optional(),
  durchwahl: z.string().trim().max(10, "Durchwahl darf maximal 10 Zeichen lang sein").optional(),
  notes: z.string().trim().max(2000, "Notizen dürfen maximal 2000 Zeichen lang sein").optional(),
  company_id: z.string().uuid("Ungültige Unternehmens-ID").optional().transform(emptyStringToNull),
  is_primary: z.boolean().default(false).optional(),
}).strict();

// Type inference for the schema
export type ContactFormValues = z.infer<typeof contactSchema>;

/**
 * Helper to convert form values to Supabase Insert type
 */
export const toContactInsert = (values: ContactFormValues): ContactInsert => ({
  vorname: values.vorname,
  nachname: values.nachname,
  anrede: values.anrede || null,
  position: values.position || null,
  email: values.email || null,
  telefon: values.telefon || null,
  mobil: values.mobil || null,
  durchwahl: values.durchwahl || null,
  notes: values.notes || null,
  company_id: values.company_id || null,
  is_primary: values.is_primary ?? false,
});

/**
 * Helper to convert form values to Supabase Update type
 */
export const toContactUpdate = (values: ContactFormValues): ContactUpdate => ({
  vorname: values.vorname,
  nachname: values.nachname,
  anrede: values.anrede || null,
  position: values.position || null,
  email: values.email || null,
  telefon: values.telefon || null,
  mobil: values.mobil || null,
  durchwahl: values.durchwahl || null,
  notes: values.notes || null,
  company_id: values.company_id || null,
  is_primary: values.is_primary ?? undefined,
});

function emptyStringToNull(val: string | null | undefined): string | null | undefined {
  return val === "" ? null : val;
}

export type ContactForm = z.infer<typeof contactSchema>;
