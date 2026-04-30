// src/lib/utils/csv-import.ts
// Utility functions for importing companies from CSV files
// This file includes functions to parse CSV files using PapaParse,
// transform the parsed data into the format expected by the database,
// and handle various edge cases in the CSV data (e.g., German number
// formats, emojis in wassertyp)
// The parsing function is designed to be flexible with column names
// and to provide informative error messages if parsing fails
// The transformation function maps the parsed data to the CompanyInsert
// type, which can then be used to insert data into the database
// The code includes helper functions for parsing German-style floats
// and stripping emojis from strings, which are common issues when
// dealing with user-generated CSV data in this context
// Country (`land`) values are normalised to ISO 3166-1 alpha-2 when recognised;
// unknown values are kept as-is for preview highlighting and server-side validation.
// The column mapping allows for flexibility in the CSV file, so users
// can have different column headers as long as they match the expected
// keys (case-insensitive)
// The code is structured to be easily extendable in the future,
// allowing for additional fields or more complex transformations as
// needed
// The use of TypeScript types helps ensure type safety and clarity
// when working with the parsed data and the transformation process,
// making it easier to maintain and debug the code in the future.
// The functions in this file can be imported and used in various parts
// of the app where CSV import functionality is needed, such as in an
// admin interface for bulk uploading companies or in a data migration
// script.

import Papa from "papaparse";
import { buildColumnMappingsFromParserFields } from "@/lib/constants/csv-import-fields";
import { normalizeLandInput } from "@/lib/countries/iso-land";
import type { CompanyInsert } from "@/types/database.types";

// Define the parsed row type from CSV
export type ParsedCompanyRow = {
  firmenname: string;
  kundentyp: string;
  wasser_distanz?: number;
  wassertyp?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  bundesland?: string;
  land?: string;
  telefon?: string;
  website?: string;
  email?: string;
  lat?: number;
  lon?: number;
  osm?: string;
};

// Helper to parse German-style floats (comma as decimal, handle scientific notation)
export function parseGermanFloat(value: string): number | undefined {
  if (!value || typeof value !== "string") return undefined;

  // Remove thousands separators (dots) and replace comma with dot
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseCoordinate(value: string | undefined | null, kind: "lat" | "lon"): number | undefined {
  if (!value || typeof value !== "string") return undefined;

  let cleaned = value.trim().replace(/[°′″'"]+/g, "");
  if (!cleaned) return undefined;

  // European format: comma as decimal, no dot present
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  }
  // Mixed separators - last separator is decimal
  else if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return undefined;

  const [min, max] = kind === "lat" ? [-90, 90] : [-180, 180];
  return num >= min && num <= max ? num : undefined;
}

// Helper to strip emojis from a string
export function stripEmojis(text: string): string {
  if (!text) return "";
  // Regex to match emojis (basic implementation, covers most cases)
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1E000}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      "",
    )
    .trim();
}

const OSM_COMPACT_ID_REGEX = /^(node|way|relation)\/(\d+)$/i;

export function normalizeCsvOsmId(value: string | undefined | null): string | undefined {
  if (!value || typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const compactMatch = trimmed.match(OSM_COMPACT_ID_REGEX);
  if (compactMatch) {
    const type = compactMatch[1];
    const id = compactMatch[2];
    if (!type || !id) return undefined;
    return `${type.toLowerCase()}/${id}`;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(trimmed);
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname !== "www.openstreetmap.org" && hostname !== "openstreetmap.org") {
      return undefined;
    }

    const pathSegments = parsedUrl.pathname
      .split("/")
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean);

    if (pathSegments.length !== 2) return undefined;

    const type = pathSegments[0];
    const id = pathSegments[1];
    if (!type || !id) return undefined;
    const pathMatch = `${type}/${id}`.match(OSM_COMPACT_ID_REGEX);
    if (!pathMatch) return undefined;

    return `${type}/${id}`;
  } catch {
    return undefined;
  }
}

/**
 * CSV column headers (after trim + toLowerCase) → ParsedCompanyRow keys.
 * Delimiter: semicolon. Required per row: Firmenname + Kundentyp.
 * Full list of accepted headers: `csvImportParserFieldRows` in `@/lib/constants/csv-import-fields`.
 */
const COLUMN_MAPPINGS: Record<string, keyof ParsedCompanyRow> = buildColumnMappingsFromParserFields();

// Parse CSV file and return parsed rows
export function parseCSVFile(file: File): Promise<ParsedCompanyRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      delimiter: ";",
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.toLowerCase().trim(),
      complete: (results: unknown) => {
        const r = results as { errors: { message: string }[]; data: Record<string, string>[] };
        if (r.errors.length > 0) {
          reject(
            new Error(
              `CSV parsing errors: ${r.errors.map((e: unknown) => (e as { message: string }).message).join(", ")}`,
            ),
          );
          return;
        }

        const parsedRows: ParsedCompanyRow[] = [];

        for (const row of r.data) {
          const parsedRow: Partial<ParsedCompanyRow> = {};

          for (const [csvKey, csvValue] of Object.entries(row)) {
            const trimmedKey = csvKey.toLowerCase().trim();
            const field = COLUMN_MAPPINGS[trimmedKey];
            if (!field) continue; // Skip unknown columns

            const trimmedValue = csvValue?.trim();
            if (!trimmedValue) continue;

            switch (field) {
              case "firmenname":
                parsedRow.firmenname = trimmedValue;
                break;
              case "kundentyp":
                // Keep as is, or map if needed (e.g., normalize to existing constants)
                parsedRow.kundentyp = trimmedValue.toLowerCase();
                break;
              case "wasser_distanz":
                parsedRow.wasser_distanz = parseGermanFloat(trimmedValue);
                break;
              case "wassertyp":
                parsedRow.wassertyp = stripEmojis(trimmedValue);
                break;
              case "strasse":
                parsedRow.strasse = trimmedValue;
                break;
              case "plz":
                parsedRow.plz = trimmedValue;
                break;
              case "ort":
                parsedRow.ort = trimmedValue;
                break;
              case "bundesland":
                parsedRow.bundesland = trimmedValue;
                break;
              case "land": {
                const landNorm = normalizeLandInput(trimmedValue);
                parsedRow.land = landNorm.ok ? landNorm.code : trimmedValue;
                break;
              }
              case "telefon":
                parsedRow.telefon = trimmedValue;
                break;
              case "website":
                parsedRow.website = trimmedValue;
                break;
              case "email":
                parsedRow.email = trimmedValue;
                break;
              case "lat":
                parsedRow.lat = parseCoordinate(trimmedValue, "lat");
                break;
              case "lon":
                parsedRow.lon = parseCoordinate(trimmedValue, "lon");
                break;
              case "osm": {
                const normalizedOsm = normalizeCsvOsmId(trimmedValue);
                if (normalizedOsm) {
                  parsedRow.osm = normalizedOsm;
                }
                break;
              }
            }
          }

          // Ensure required fields are present
          if (parsedRow.firmenname && parsedRow.kundentyp) {
            parsedRows.push(parsedRow as ParsedCompanyRow);
          }
        }

        resolve(parsedRows);
      },
      error: (error: unknown) => {
        const err = error as { message: string };
        reject(new Error(`CSV parsing failed: ${err.message}`));
      },
    });
  });
}

// Transform parsed row to CompanyInsert
export function transformToCompanyInsert(row: ParsedCompanyRow): CompanyInsert {
  return {
    firmenname: row.firmenname,
    kundentyp: row.kundentyp,
    // Map other fields as needed; assuming defaults for missing ones
    rechtsform: null,
    firmentyp: null,
    status: "lead",
    value: null,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    osm: row.osm ?? null,
    user_id: null, // Will be set by service layer
    // Note: Additional fields like strasse, plz, etc., might need to be handled separately if not in CompanyInsert
  };
}
