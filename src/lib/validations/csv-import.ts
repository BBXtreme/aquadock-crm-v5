// Zod schemas for CSV import preview / server validation — aligned with ParsedCompanyRow from csv-import utils

import { z } from "zod";

export const parsedCompanyRowSchema = z
  .object({
    firmenname: z.string().trim().min(1, "Firmenname ist erforderlich"),
    kundentyp: z.string().trim().min(1, "Kundentyp ist erforderlich"),
    wasser_distanz: z.number().optional(),
    wassertyp: z.string().trim().optional(),
    strasse: z.string().trim().optional(),
    plz: z.string().trim().optional(),
    ort: z.string().trim().optional(),
    bundesland: z.string().trim().optional(),
    /** Raw or normalised value from CSV parse; ISO enforcement happens in `importCompaniesFromCSV`. */
    land: z.string().trim().max(120).optional(),
    telefon: z.string().trim().optional(),
    website: z.string().trim().optional(),
    email: z.string().trim().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    osm: z.string().trim().optional(),
  })
  .strict();

export type ParsedCompanyRowForm = z.infer<typeof parsedCompanyRowSchema>;

export const parsedCompanyRowsSchema = z.array(parsedCompanyRowSchema);

/** Max rows per CSV preview AI enrichment batch (must match server action). */
export const CSV_IMPORT_AI_PREVIEW_MAX_ROWS = 50;

/** CSV import preview: AI enrichment batch (same row shape, bounded size). */
export const parsedCompanyRowsAiPreviewSchema = z
  .array(parsedCompanyRowSchema)
  .min(1)
  .max(CSV_IMPORT_AI_PREVIEW_MAX_ROWS);
