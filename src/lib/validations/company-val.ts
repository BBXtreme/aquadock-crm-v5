// src/lib/validations/company-val.ts
// This file defines the Zod schema for validating company data
// It includes all fields that are part of the company form, with
// appropriate validation rules for each field
// The schema ensures that required fields are present and that all
// string fields are trimmed and have reasonable length limits to
// prevent issues with excessively long input
// The inferred TypeScript type `CompanyFormValues` can be used in
// form handling to ensure type safety
// The `CompanyFormValues` type can be used in form handling for
// company data to ensure type safety and consistency across the app

import { z } from "zod";

// Zod schema for Company creation/update based on form requirements
// Includes all fields used in CompanyCreateForm
// Security: All string fields are trimmed and have max length limits
export const companySchema = z.object({
  firmenname: z
    .string()
    .min(1, "Firmenname ist erforderlich")
    .trim()
    .max(200, "Firmenname darf maximal 200 Zeichen lang sein"),
  rechtsform: z.string().trim().max(50, "Rechtsform darf maximal 50 Zeichen lang sein").nullable().optional(),
  kundentyp: z.string().trim().max(50, "Kundentyp darf maximal 50 Zeichen lang sein"),
  firmentyp: z.string().trim().max(20, "Firmentyp darf maximal 20 Zeichen lang sein").nullable().optional(),
  website: z.string().trim().max(500, "Website darf maximal 500 Zeichen lang sein").nullable().optional(),
  telefon: z.string().trim().max(50, "Telefon darf maximal 50 Zeichen lang sein").nullable().optional(),
  email: z.string().nullable().optional(),
  strasse: z.string().trim().max(200, "Straße darf maximal 200 Zeichen lang sein").nullable().optional(),
  plz: z.string().trim().max(10, "PLZ darf maximal 10 Zeichen lang sein").nullable().optional(),
  stadt: z.string().trim().max(100, "Stadt darf maximal 100 Zeichen lang sein").nullable().optional(),
  bundesland: z.string().trim().max(50, "Bundesland darf maximal 50 Zeichen lang sein").nullable().optional(),
  land: z.string().trim().max(50, "Land darf maximal 50 Zeichen lang sein").nullable().optional(),
  wasserdistanz: z.number().nullable().optional(),
  wassertyp: z.string().trim().max(100, "Wassertyp darf maximal 100 Zeichen lang sein").nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  osm: z.string().trim().max(100, "OSM darf maximal 100 Zeichen lang sein").nullable().optional(),
  status: z.enum(["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren"]),
  value: z.number().nullable().optional(),
  notes: z.string().trim().max(2000, "Notizen dürfen maximal 2000 Zeichen lang sein").nullable().optional(),
});

// Type inference for the schema
export type CompanyFormValues = z.infer<typeof companySchema>;
