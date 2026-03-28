import { z } from "zod";

// Zod schema for Company creation/update based on form requirements
// Includes all fields used in CompanyCreateForm
export const companySchema = z.object({
  firmenname: z.string().min(1, "Firmenname ist erforderlich"),
  rechtsform: z.string().optional(),
  kundentyp: z.string().optional(),
  firmentyp: z.string().optional(),
  website: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().optional(),
  strasse: z.string().optional(),
  plz: z.string().optional(),
  stadt: z.string().optional(),
  bundesland: z.string().optional(),
  land: z.string().optional(),
  wasserdistanz: z.number().optional(),
  wassertyp: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  osm: z.string().optional(),
  status: z
    .enum([
      "lead",
      "interessant",
      "qualifiziert",
      "akquise",
      "angebot",
      "gewonnen",
      "verloren",
      "kunde",
      "partner",
      "inaktiv",
    ])
    .optional(),
  value: z.number().optional(),
  notes: z.string().optional(),
});

// Type inference for the schema
export type CompanyFormValues = z.infer<typeof companySchema>;
