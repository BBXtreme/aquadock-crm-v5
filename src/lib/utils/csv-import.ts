import Papa from "papaparse";
import type { CompanyInsert } from "@/lib/supabase/database.types";

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
function parseGermanFloat(value: string): number | undefined {
  if (!value || typeof value !== "string") return undefined;

  // Remove thousands separators (dots) and replace comma with dot
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// Helper to strip emojis from a string
function stripEmojis(text: string): string {
  if (!text) return "";
  // Regex to match emojis (basic implementation, covers most cases)
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1E000}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      "",
    )
    .trim();
}

// Map for normalizing land codes to full names
const LAND_NORMALIZE_MAP: Record<string, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  // Add more as needed
};

// Flexible column name mapping
const COLUMN_MAPPINGS: Record<string, keyof ParsedCompanyRow> = {
  name: "firmenname",
  firmenname: "firmenname",
  kategorie: "kundentyp",
  kundentyp: "kundentyp",
  "wasserdistanz (m)": "wasser_distanz",
  wasser_distanz: "wasser_distanz",
  wassertyp: "wassertyp",
  strasse: "strasse",
  straße: "strasse", // Handle umlaut
  plz: "plz",
  ort: "ort",
  bundesland: "bundesland",
  land: "land",
  telefon: "telefon",
  website: "website",
  email: "email",
  lat: "lat",
  lon: "lon",
  osm: "osm",
};

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
                const normalizedLand = LAND_NORMALIZE_MAP[trimmedValue.toUpperCase()] || trimmedValue;
                parsedRow.land = normalizedLand;
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
                parsedRow.lat = parseGermanFloat(trimmedValue);
                break;
              case "lon":
                parsedRow.lon = parseGermanFloat(trimmedValue);
                break;
              case "osm":
                parsedRow.osm = trimmedValue;
                break;
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
