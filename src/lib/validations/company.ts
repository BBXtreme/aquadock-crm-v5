// src/lib/validations/company.ts
// Zod schema for Company forms – synced with Supabase types

import { z } from "zod";
import type { CompanyInsert } from "@/types/database.types";

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

export type CompanyFormValues = z.infer<typeof companySchema>;

export const toCompanyInsert = (values: CompanyFormValues): CompanyInsert => ({
  firmenname: values.firmenname,
  rechtsform: values.rechtsform || null,
  kundentyp: values.kundentyp,
  firmentyp: values.firmentyp || null,
  website: values.website || null,
  telefon: values.telefon || null,
  email: values.email || null,
  strasse: values.strasse || null,
  plz: values.plz || null,
  stadt: values.stadt || null,
  bundesland: values.bundesland || null,
  land: values.land || null,
  wasserdistanz: values.wasserdistanz ?? null,
  wassertyp: values.wassertyp || null,
  lat: values.lat ?? null,
  lon: values.lon ?? null,
  osm: values.osm || null,
  status: values.status,
  value: values.value ?? null,
  notes: values.notes || null,
});
