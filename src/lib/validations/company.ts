import { z } from "zod";

// Zod schema for Company creation/update based on form requirements
// Includes all fields used in CompanyCreateForm
// Security: All string fields are trimmed and have max length limits
export const companySchema = z.object({
  firmenname: z.string().min(1, "Firmenname ist erforderlich").trim().max(200, "Firmenname darf maximal 200 Zeichen lang sein"),
  rechtsform: z.string().optional().trim().max(50, "Rechtsform darf maximal 50 Zeichen lang sein"),
  kundentyp: z.string().optional().trim().max(50, "Kundentyp darf maximal 50 Zeichen lang sein"),
  firmentyp: z.string().optional().trim().max(20, "Firmentyp darf maximal 20 Zeichen lang sein"),
  website: z.string().optional().trim().max(500, "Website darf maximal 500 Zeichen lang sein"),
  telefon: z.string().optional().trim().max(50, "Telefon darf maximal 50 Zeichen lang sein"),
  email: z.string().optional().trim().max(254, "E-Mail darf maximal 254 Zeichen lang sein"),
  strasse: z.string().optional().trim().max(200, "Straße darf maximal 200 Zeichen lang sein"),
  plz: z.string().optional().trim().max(10, "PLZ darf maximal 10 Zeichen lang sein"),
  stadt: z.string().optional().trim().max(100, "Stadt darf maximal 100 Zeichen lang sein"),
  bundesland: z.string().optional().trim().max(50, "Bundesland darf maximal 50 Zeichen lang sein"),
  land: z.string().optional().trim().max(50, "Land darf maximal 50 Zeichen lang sein"),
  wasserdistanz: z.number().optional(),
  wassertyp: z.string().optional().trim().max(100, "Wassertyp darf maximal 100 Zeichen lang sein"),
  lat: z.number().optional(),
  lon: z.number().optional(),
  osm: z.string().optional().trim().max(100, "OSM darf maximal 100 Zeichen lang sein"),
  status: z
    .enum([
      "lead",
      "interessant",
      "qualifiziert",
      "akquise",
      "angebot",
      "gewonnen",
      "verloren",
    ])
    .optional(),
  value: z.number().optional(),
  notes: z.string().optional().trim().max(2000, "Notizen dürfen maximal 2000 Zeichen lang sein"),
});

// Type inference for the schema
export type CompanyFormValues = z.infer<typeof companySchema>;
