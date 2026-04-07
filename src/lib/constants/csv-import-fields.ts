/**
 * CSV company import: human-readable field reference and header aliases.
 * Parser mapping is built from `csvImportParserFieldRows` in `@/lib/utils/csv-import`.
 */

import type { ParsedCompanyRow } from "@/lib/utils/csv-import";

export interface CsvImportParserFieldRow {
  internalKey: keyof ParsedCompanyRow;
  labelDe: string;
  recommendedHeader: string;
  /** Lowercase keys as after PapaParse transformHeader (trim + toLowerCase). */
  acceptedHeaders: readonly string[];
  example: string;
  dataType: string;
  required: boolean;
  notesDe: string;
}

export interface CsvImportFutureFieldRow {
  id: string;
  labelDe: string;
  recommendedHeader: string;
  acceptedHeaders: readonly string[];
  example: string;
  dataType: string;
  required: boolean;
  notesDe: string;
}

const KUNDENTYP_VALUES =
  "Kleinbuchstaben, z. B. restaurant, hotel, resort, camping, marina, segelschule, segelverein, bootsverleih, neukunde, bestandskunde, interessent, partner, sonstige.";

/**
 * Single source of truth for recognized CSV headers → ParsedCompanyRow keys.
 * Order: Pflichtfelder, Adresse, Kontakt, Geo, Wasser, OSM.
 */
export const csvImportParserFieldRows: readonly CsvImportParserFieldRow[] = [
  {
    internalKey: "firmenname",
    labelDe: "Firmenname",
    recommendedHeader: "Firmenname",
    acceptedHeaders: ["firmenname", "name", "firma", "unternehmen"],
    example: "Seehotel Marina",
    dataType: "Text",
    required: true,
    notesDe: "Pflichtfeld. Mindestens ein Name pro Zeile.",
  },
  {
    internalKey: "kundentyp",
    labelDe: "Kundentyp / Kategorie",
    recommendedHeader: "Kundentyp",
    acceptedHeaders: ["kundentyp", "kategorie", "kundentyp (crm)", "typ"],
    example: "hotel",
    dataType: "Text (Enum)",
    required: true,
    notesDe: `Pflichtfeld. ${KUNDENTYP_VALUES}`,
  },
  {
    internalKey: "strasse",
    labelDe: "Straße / Adresse",
    recommendedHeader: "Strasse",
    acceptedHeaders: ["strasse", "straße", "adresse", "street", "anschrift"],
    example: "Hafenstraße 12",
    dataType: "Text",
    required: false,
    notesDe: "Adresszeile ohne PLZ/Ort.",
  },
  {
    internalKey: "plz",
    labelDe: "Postleitzahl",
    recommendedHeader: "PLZ",
    acceptedHeaders: ["plz", "postleitzahl", "postal", "zip"],
    example: "80331",
    dataType: "Text",
    required: false,
    notesDe: "",
  },
  {
    internalKey: "ort",
    labelDe: "Ort / Stadt",
    recommendedHeader: "Ort",
    acceptedHeaders: ["ort", "stadt", "city", "wohnort"],
    example: "München",
    dataType: "Text",
    required: false,
    notesDe: "Wird beim Import in der Datenbank als Stadt gespeichert.",
  },
  {
    internalKey: "bundesland",
    labelDe: "Bundesland / Region",
    recommendedHeader: "Bundesland",
    acceptedHeaders: ["bundesland", "region", "state"],
    example: "Bayern",
    dataType: "Text",
    required: false,
    notesDe: "",
  },
  {
    internalKey: "land",
    labelDe: "Land",
    recommendedHeader: "Land",
    acceptedHeaders: ["land", "country"],
    example: "Deutschland oder DE",
    dataType: "Text",
    required: false,
    notesDe: "Kürzel DE, AT, CH werden zu Landnamen normalisiert.",
  },
  {
    internalKey: "telefon",
    labelDe: "Telefon",
    recommendedHeader: "Telefon",
    acceptedHeaders: ["telefon", "tel", "phone", "telefonnummer", "handy"],
    example: "+49 89 123456",
    dataType: "Text",
    required: false,
    notesDe: "",
  },
  {
    internalKey: "email",
    labelDe: "E-Mail",
    recommendedHeader: "Email",
    acceptedHeaders: ["email", "e-mail", "e_mail", "mail"],
    example: "info@example.com",
    dataType: "Text",
    required: false,
    notesDe: "",
  },
  {
    internalKey: "website",
    labelDe: "Website",
    recommendedHeader: "Website",
    acceptedHeaders: ["website", "web", "url", "homepage"],
    example: "https://example.com",
    dataType: "Text (URL)",
    required: false,
    notesDe: "",
  },
  {
    internalKey: "lat",
    labelDe: "Breitengrad",
    recommendedHeader: "lat",
    acceptedHeaders: ["lat", "latitude", "breitengrad", "breite", "geo_lat"],
    example: "48,137154",
    dataType: "Zahl (deutsch: Komma)",
    required: false,
    notesDe: "Dezimalzahl; Komma oder Punkt möglich.",
  },
  {
    internalKey: "lon",
    labelDe: "Längengrad",
    recommendedHeader: "lon",
    acceptedHeaders: ["lon", "lng", "longitude", "längengrad", "laengengrad", "lange", "geo_lon"],
    example: "11,576124",
    dataType: "Zahl (deutsch: Komma)",
    required: false,
    notesDe: "Dezimalzahl; Komma oder Punkt möglich.",
  },
  {
    internalKey: "wasser_distanz",
    labelDe: "Wasserdistanz (m)",
    recommendedHeader: "Wasserdistanz (m)",
    acceptedHeaders: ["wasserdistanz (m)", "wasser_distanz", "wasserdistanz", "distanz wasser"],
    example: "120",
    dataType: "Zahl (m)",
    required: false,
    notesDe: "Meter als Zahl.",
  },
  {
    internalKey: "wassertyp",
    labelDe: "Wassertyp",
    recommendedHeader: "Wassertyp",
    acceptedHeaders: ["wassertyp", "gewässer", "gewaesser", "water type"],
    example: "See",
    dataType: "Text",
    required: false,
    notesDe: "Emojis werden beim Import entfernt.",
  },
  {
    internalKey: "osm",
    labelDe: "OpenStreetMap-Referenz",
    recommendedHeader: "osm",
    acceptedHeaders: ["osm", "osm_id", "openstreetmap"],
    example: "node/123456",
    dataType: "Text",
    required: false,
    notesDe: "Format node/ID, way/ID oder relation/ID.",
  },
];

/** Fields documented for users but not read by the current CSV → companies import. */
export const csvImportNotYetImportedRows: readonly CsvImportFutureFieldRow[] = [
  {
    id: "rechtsform",
    labelDe: "Rechtsform",
    recommendedHeader: "Rechtsform",
    acceptedHeaders: ["rechtsform", "legal form"],
    example: "GmbH",
    dataType: "Text",
    required: false,
    notesDe: "Wird beim CSV-Import derzeit nicht übernommen (geplante Erweiterung).",
  },
  {
    id: "firmentyp",
    labelDe: "Firmentyp",
    recommendedHeader: "Firmentyp",
    acceptedHeaders: ["firmentyp", "kettenbetrieb", "einzelstandort"],
    example: "kette oder einzeln",
    dataType: "Text",
    required: false,
    notesDe: "Wird beim CSV-Import derzeit nicht übernommen. Erlaubte Werte im CRM: kette, einzeln.",
  },
  {
    id: "value",
    labelDe: "Wert (€)",
    recommendedHeader: "Wert",
    acceptedHeaders: ["value", "wert", "deal value", "umsatz"],
    example: "50000",
    dataType: "Zahl",
    required: false,
    notesDe: "Wird beim CSV-Import derzeit nicht übernommen.",
  },
  {
    id: "notes",
    labelDe: "Notizen",
    recommendedHeader: "Notizen",
    acceptedHeaders: ["notes", "notizen", "beschreibung", "kommentar", "bemerkung"],
    example: "Follow-up im Q2",
    dataType: "Text",
    required: false,
    notesDe: "Wird beim CSV-Import derzeit nicht übernommen.",
  },
  {
    id: "ap1_vorname",
    labelDe: "Ansprechpartner 1 – Vorname",
    recommendedHeader: "AP1_Vorname",
    acceptedHeaders: ["ap1_vorname", "vorname ap1", "kontakt1_vorname"],
    example: "Max",
    dataType: "Text",
    required: false,
    notesDe: "Kontaktspalten werden beim Unternehmens-CSV-Import ignoriert; Kontakte separat anlegen.",
  },
  {
    id: "ap1_nachname",
    labelDe: "Ansprechpartner 1 – Nachname",
    recommendedHeader: "AP1_Nachname",
    acceptedHeaders: ["ap1_nachname", "nachname ap1", "kontakt1_nachname"],
    example: "Mustermann",
    dataType: "Text",
    required: false,
    notesDe: "Wird beim CSV-Import derzeit nicht übernommen.",
  },
  {
    id: "ap1_email",
    labelDe: "Ansprechpartner 1 – E-Mail",
    recommendedHeader: "AP1_Email",
    acceptedHeaders: ["ap1_email", "email ap1", "kontakt1_email"],
    example: "max@example.com",
    dataType: "Text",
    required: false,
    notesDe: "Wird beim CSV-Import derzeit nicht übernommen.",
  },
  {
    id: "ap1_telefon",
    labelDe: "Ansprechpartner 1 – Telefon",
    recommendedHeader: "AP1_Telefon",
    acceptedHeaders: ["ap1_telefon", "telefon ap1"],
    example: "+49 170 000000",
    dataType: "Text",
    required: false,
    notesDe: "Wird beim CSV-Import derzeit nicht übernommen.",
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
