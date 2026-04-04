// src/lib/validations/company.ts
// Zod schema for Company forms – synced with Supabase types

import { z } from "zod";
import type { CompanyInsert, CompanyUpdate } from "@/types/database.types";

export const companySchema = z.object({
  firmenname: z
    .string()
    .trim()
    .min(1, "Firmenname ist erforderlich")
    .max(200, "Firmenname darf maximal 200 Zeichen lang sein"),
  rechtsform: z.string().trim().max(50, "Rechtsform darf maximal 50 Zeichen lang sein").nullable().optional(),
  kundentyp: z.enum([
    "restaurant",
    "hotel",
    "resort",
    "camping",
    "marina",
    "segelschule",
    "segelverein",
    "bootsverleih",
    "neukunde",
    "bestandskunde",
    "interessent",
    "partner",
    "sonstige"
  ], { required_error: "Kundentyp ist erforderlich" }),
  firmentyp: z.string().trim().max(20, "Firmentyp darf maximal 20 Zeichen lang sein").nullable().optional(),
  website: z.string().trim().url("Ungültige URL").max(500, "Website darf maximal 500 Zeichen lang sein").nullable().optional().transform(emptyStringToNull),
  telefon: z.string().trim().max(50, "Telefon darf maximal 50 Zeichen lang sein").nullable().optional(),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(320, "E-Mail darf maximal 320 Zeichen lang sein").nullable().optional().transform(emptyStringToNull),
  strasse: z.string().trim().max(200, "Straße darf maximal 200 Zeichen lang sein").nullable().optional(),
  plz: z.string().trim().max(10, "PLZ darf maximal 10 Zeichen lang sein").nullable().optional(),
  stadt: z.string().trim().max(100, "Stadt darf maximal 100 Zeichen lang sein").nullable().optional(),
  bundesland: z.string().trim().max(50, "Bundesland darf maximal 50 Zeichen lang sein").nullable().optional(),
  land: z.string().trim().max(50, "Land darf maximal 50 Zeichen lang sein").nullable().optional(),
  wasserdistanz: z.number().nullable().optional(),
  wassertyp: z.string().trim().max(50, "Wassertyp darf maximal 50 Zeichen lang sein").nullable().optional(),
  lat: z.preprocess((val) => val === "" ? null : val, z.union([z.number().min(-90, "Latitude muss zwischen -90 und 90 liegen").max(90, "Latitude muss zwischen -90 und 90 liegen"), z.null()]).optional()),
  lon: z.preprocess((val) => val === "" ? null : val, z.union([z.number().min(-180, "Longitude muss zwischen -180 und 180 liegen").max(180, "Longitude muss zwischen -180 und 180 liegen"), z.null()]).optional()),
  osm: z.string().trim().regex(/^(node|way|relation)\/\d+$/, "Ungültiges OSM Format").max(100, "OSM darf maximal 100 Zeichen lang sein").nullable().optional(),
  status: z.enum([
    "lead",
    "interessant",
    "qualifiziert",
    "akquise",
    "angebot",
    "gewonnen",
    "verloren",
    "kunde",
    "partner",
    "inaktiv"
  ], { required_error: "Status ist erforderlich" }),
  value: z.number().nullable().optional(),
  notes: z.string().trim().max(2000, "Notizen dürfen maximal 2000 Zeichen lang sein").nullable().optional(),
}).strict();

export type CompanyFormValues = z.infer<typeof companySchema>;

export const toCompanyInsert = (values: CompanyFormValues): CompanyInsert => ({
  firmenname: values.firmenname,
  rechtsform: values.rechtsform || null,
  kundentyp: values.kundentyp,
  firmentyp: values.firmentyp || null,
  website: (values.website as string | null | undefined) || null,
  telefon: values.telefon || null,
  email: (values.email as string | null | undefined) || null,
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

export const toCompanyUpdate = (values: CompanyFormValues): CompanyUpdate => ({
  firmenname: values.firmenname,
  rechtsform: values.rechtsform || null,
  kundentyp: values.kundentyp,
  firmentyp: values.firmentyp || null,
  website: (values.website as string | null | undefined) || null,
  telefon: values.telefon || null,
  email: (values.email as string | null | undefined) || null,
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

function emptyStringToNull(val: string | null | undefined): string | null | undefined {
  return val === "" ? null : val;
}

export type CompanyForm = z.infer<typeof companySchema>;
