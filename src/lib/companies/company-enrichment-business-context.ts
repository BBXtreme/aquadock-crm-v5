/**
 * Pure mapping from CSV preview rows to enrichment prompt context.
 * Kept outside `"use server"` modules so sync helpers are not treated as Server Actions.
 */

import type { ParsedCompanyRow } from "@/lib/utils/csv-import";

export type CompanyEnrichmentBusinessContext = {
  firmenname: string;
  rechtsform: string | null;
  kundentyp: string;
  firmentyp: string | null;
  website: string | null;
  email: string | null;
  telefon: string | null;
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
  bundesland: string | null;
  land: string | null;
  notes: string | null;
  wasserdistanz: number | null;
  wassertyp: string | null;
  osm: string | null;
  lat: number | null;
  lon: number | null;
};

export function buildEnrichmentContextFromParsedRow(row: ParsedCompanyRow): CompanyEnrichmentBusinessContext {
  return {
    firmenname: row.firmenname,
    rechtsform: null,
    kundentyp: row.kundentyp,
    firmentyp: null,
    website: row.website ?? null,
    email: row.email ?? null,
    telefon: row.telefon ?? null,
    strasse: row.strasse ?? null,
    plz: row.plz ?? null,
    stadt: row.ort ?? null,
    bundesland: row.bundesland ?? null,
    land: row.land ?? null,
    notes: null,
    wasserdistanz: row.wasser_distanz ?? null,
    wassertyp: row.wassertyp ?? null,
    osm: row.osm ?? null,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
  };
}
