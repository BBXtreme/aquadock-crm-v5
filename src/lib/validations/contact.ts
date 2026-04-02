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
  anrede: z.string().trim().max(20, "Anrede darf maximal 20 Zeichen lang sein").nullable().optional(),
  position: z.string().trim().max(100, "Position darf maximal 100 Zeichen lang sein").nullable().optional(),
  email: z.string().nullable().optional(),
  telefon: z.string().trim().max(50, "Telefon darf maximal 50 Zeichen lang sein").nullable().optional(),
  mobil: z.string().trim().max(50, "Mobil darf maximal 50 Zeichen lang sein").nullable().optional(),
  durchwahl: z.string().trim().max(10, "Durchwahl darf maximal 10 Zeichen lang sein").nullable().optional(),
  notes: z.string().trim().max(2000, "Notizen dürfen maximal 2000 Zeichen lang sein").nullable().optional(),
  company_id: z.string().nullable().optional(),
  is_primary: z.boolean().default(false).optional(),
});

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