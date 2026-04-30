/**
 * CSV company import: human-readable field reference and header aliases.
 * Parser mapping is built from `csvImportParserFieldRows` in `@/lib/utils/csv-import`.
 */

import type { ParsedCompanyRow } from "@/lib/utils/csv-import";

export interface CsvImportParserFieldRow {
  internalKey: keyof ParsedCompanyRow;
  recommendedHeader: string;
  /** Lowercase keys as after PapaParse transformHeader (trim + toLowerCase). */
  acceptedHeaders: readonly string[];
  example: string;
  required: boolean;
}

export type CsvImportFutureFieldId =
  | "rechtsform"
  | "firmentyp"
  | "value"
  | "notes"
  | "ap1_vorname"
  | "ap1_nachname"
  | "ap1_email"
  | "ap1_telefon";

export interface CsvImportFutureFieldRow {
  id: CsvImportFutureFieldId;
  recommendedHeader: string;
  acceptedHeaders: readonly string[];
  example: string;
  required: boolean;
}

/**
 * Single source of truth for recognized CSV headers → ParsedCompanyRow keys.
 * Order: Pflichtfelder, Adresse, Kontakt, Geo, Wasser, OSM.
 */
export const csvImportParserFieldRows: readonly CsvImportParserFieldRow[] = [
  {
    internalKey: "firmenname",
    recommendedHeader: "Firmenname",
    acceptedHeaders: ["firmenname", "name", "firma", "unternehmen"],
    example: "Seehotel Marina",
    required: true,
  },
  {
    internalKey: "kundentyp",
    recommendedHeader: "Kundentyp",
    acceptedHeaders: ["kundentyp", "kategorie", "kundentyp (crm)", "typ"],
    example: "hotel",
    required: true,
  },
  {
    internalKey: "strasse",
    recommendedHeader: "Strasse",
    acceptedHeaders: ["strasse", "straße", "adresse", "street", "anschrift"],
    example: "Hafenstraße 12",
    required: false,
  },
  {
    internalKey: "plz",
    recommendedHeader: "PLZ",
    acceptedHeaders: ["plz", "postleitzahl", "postal", "zip"],
    example: "80331",
    required: false,
  },
  {
    internalKey: "ort",
    recommendedHeader: "Ort",
    acceptedHeaders: ["ort", "stadt", "city", "wohnort"],
    example: "München",
    required: false,
  },
  {
    internalKey: "bundesland",
    recommendedHeader: "Bundesland",
    acceptedHeaders: ["bundesland", "region", "state"],
    example: "Bayern",
    required: false,
  },
  {
    internalKey: "land",
    recommendedHeader: "Land",
    acceptedHeaders: ["land", "country"],
    example: "DE (ISO), Deutschland, oder HR",
    required: false,
  },
  {
    internalKey: "telefon",
    recommendedHeader: "Telefon",
    acceptedHeaders: ["telefon", "tel", "phone", "telefonnummer", "handy"],
    example: "+49 89 123456",
    required: false,
  },
  {
    internalKey: "email",
    recommendedHeader: "Email",
    acceptedHeaders: ["email", "e-mail", "e_mail", "mail"],
    example: "info@example.com",
    required: false,
  },
  {
    internalKey: "website",
    recommendedHeader: "Website",
    acceptedHeaders: ["website", "web", "url", "homepage"],
    example: "https://example.com",
    required: false,
  },
  {
    internalKey: "lat",
    recommendedHeader: "lat",
    acceptedHeaders: ["lat", "latitude", "breitengrad", "breite", "geo_lat"],
    example: "48.137154 oder 48,137154 (nur -90 bis 90)",
    required: false,
  },
  {
    internalKey: "lon",
    recommendedHeader: "lon",
    acceptedHeaders: ["lon", "lng", "longitude", "längengrad", "laengengrad", "lange", "geo_lon"],
    example: "11.576124 oder 11,576124 (nur -180 bis 180)",
    required: false,
  },
  {
    internalKey: "wasser_distanz",
    recommendedHeader: "Wasserdistanz (m)",
    acceptedHeaders: ["wasserdistanz (m)", "wasser_distanz", "wasserdistanz", "distanz wasser"],
    example: "120",
    required: false,
  },
  {
    internalKey: "wassertyp",
    recommendedHeader: "Wassertyp",
    acceptedHeaders: ["wassertyp", "gewässer", "gewaesser", "water type"],
    example: "See",
    required: false,
  },
  {
    internalKey: "osm",
    recommendedHeader: "osm",
    acceptedHeaders: ["osm", "osm_id", "openstreetmap"],
    example: "node/123456 oder https://www.openstreetmap.org/node/123456 (gespeichert als node/123456)",
    required: false,
  },
];

/** Fields documented for users but not read by the current CSV → companies import. */
export const csvImportNotYetImportedRows: readonly CsvImportFutureFieldRow[] = [
  {
    id: "rechtsform",
    recommendedHeader: "Rechtsform",
    acceptedHeaders: ["rechtsform", "legal form"],
    example: "GmbH",
    required: false,
  },
  {
    id: "firmentyp",
    recommendedHeader: "Firmentyp",
    acceptedHeaders: ["firmentyp", "kettenbetrieb", "einzelstandort"],
    example: "kette oder einzeln",
    required: false,
  },
  {
    id: "value",
    recommendedHeader: "Wert",
    acceptedHeaders: ["value", "wert", "deal value", "umsatz"],
    example: "50000",
    required: false,
  },
  {
    id: "notes",
    recommendedHeader: "Notizen",
    acceptedHeaders: ["notes", "notizen", "beschreibung", "kommentar", "bemerkung"],
    example: "Follow-up im Q2",
    required: false,
  },
  {
    id: "ap1_vorname",
    recommendedHeader: "AP1_Vorname",
    acceptedHeaders: ["ap1_vorname", "vorname ap1", "kontakt1_vorname"],
    example: "Max",
    required: false,
  },
  {
    id: "ap1_nachname",
    recommendedHeader: "AP1_Nachname",
    acceptedHeaders: ["ap1_nachname", "nachname ap1", "kontakt1_nachname"],
    example: "Mustermann",
    required: false,
  },
  {
    id: "ap1_email",
    recommendedHeader: "AP1_Email",
    acceptedHeaders: ["ap1_email", "email ap1", "kontakt1_email"],
    example: "max@example.com",
    required: false,
  },
  {
    id: "ap1_telefon",
    recommendedHeader: "AP1_Telefon",
    acceptedHeaders: ["ap1_telefon", "telefon ap1"],
    example: "+49 170 000000",
    required: false,
  },
];

export function buildColumnMappingsFromParserFields(): Record<string, keyof ParsedCompanyRow> {
  const map: Record<string, keyof ParsedCompanyRow> = {};
  for (const row of csvImportParserFieldRows) {
    for (const h of row.acceptedHeaders) {
      const key = h.toLowerCase().trim();
      map[key] = row.internalKey;
    }
  }
  return map;
}
