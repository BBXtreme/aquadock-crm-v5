// src/lib/actions/companies.ts
// Server Actions for Company CRUD – CRM v5 (fully typed + Zod validated)

"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteCompanyWithTrash, type TrashDeleteMode } from "@/lib/actions/crm-trash";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { type ParsedCompanyRow, parseCoordinate } from "@/lib/utils/csv-import";
import {
  type GeocodeAddressResult,
  type GeocodeConfidence,
  type GeocodeFailureReason,
  geocodeAddress,
} from "@/lib/utils/geocode-nominatim";
import { type CompanyFormValues, companySchema, toCompanyInsert } from "@/lib/validations/company";
import type {
  Company,
  CompanyInsert,
  CompanyUpdate,
  Contact,
  KPI,
  TimelineEntryInsert,
} from "@/types/database.types";

export type CompanyForOpenMap = Company & {
  contacts?: Contact[];
};

/* ──────────────────────────────────────────────────────────────
   GET ALL COMPANIES FOR MAP
   ────────────────────────────────────────────────────────────── */
export async function getCompaniesForOpenMap(
  supabase: SupabaseClient
): Promise<CompanyForOpenMap[]> {
  const { data, error } = await supabase
    .from("companies")
    .select(`
      *,
      contacts (*)
    `)
    .is("deleted_at", null);

  if (error) throw handleSupabaseError(error, "getCompaniesForOpenMap");
  const rows = data ?? [];
  return rows.map((row) => ({
    ...row,
    contacts: (row.contacts ?? []).filter((c: { deleted_at?: string | null }) => c.deleted_at == null),
  })) as CompanyForOpenMap[];
}

/* ──────────────────────────────────────────────────────────────
   GET COMPANIES WITH PAGINATION + FILTERS
   ────────────────────────────────────────────────────────────── */
export async function getCompanies(
  supabase: SupabaseClient,
  options: {
    page?: number;
    pageSize?: number;
    statusFilters?: string[];
    kundentypFilters?: string[];
    firmentypFilters?: string[];
    landFilters?: string[];
    sortBy?: string;
    sortDesc?: boolean;
  } = {}
): Promise<{ data: Company[]; total: number }> {
  const {
    page = 0,
    pageSize = 20,
    statusFilters,
    kundentypFilters,
    firmentypFilters,
    landFilters,
    sortBy,
    sortDesc = false,
  } = options;

  let query = supabase.from("companies").select("*", { count: "exact" }).is("deleted_at", null);

  if (statusFilters?.length) query = query.in("status", statusFilters);
  if (kundentypFilters?.length) query = query.in("kundentyp", kundentypFilters);
  if (firmentypFilters?.length) query = query.in("firmentyp", firmentypFilters);
  if (landFilters?.length) query = query.in("land", landFilters);

  if (sortBy) {
    query = query.order(sortBy, { ascending: !sortDesc });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw handleSupabaseError(error, "getCompanies");

  return { data: data ?? [], total: count ?? 0 };
}

/* ──────────────────────────────────────────────────────────────
   RESOLVE COMPANY DETAIL (active vs Papierkorb vs missing)
   ────────────────────────────────────────────────────────────── */
export type ResolveCompanyDetailResult =
  | { kind: "active"; company: Company }
  | { kind: "trashed" }
  | { kind: "missing" };

export async function resolveCompanyDetail(
  id: string,
  supabase: SupabaseClient,
): Promise<ResolveCompanyDetailResult> {
  const { data, error } = await supabase
    .from("companies")
    .select(`
      id, firmenname, status, kundentyp, firmentyp, rechtsform, value,
      strasse, plz, stadt, bundesland, land, telefon, email, website,
      notes,
      lat, lon, osm, wasserdistanz, wassertyp, created_at, updated_at,
      deleted_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveCompanyDetail");

  if (data === null) {
    return { kind: "missing" };
  }

  if (data.deleted_at !== null && data.deleted_at !== undefined) {
    return { kind: "trashed" };
  }

  return { kind: "active", company: data as Company };
}

/* ──────────────────────────────────────────────────────────────
   CREATE COMPANY (Zod validated)
   ────────────────────────────────────────────────────────────── */
export async function createCompany(values: CompanyFormValues, supabase?: SupabaseClient): Promise<Company> {
  const validated = companySchema.safeParse(values);
  if (!validated.success) {
    throw new Error("Validierungsfehler beim Erstellen des Unternehmens");
  }

  const client = supabase ?? await createServerSupabaseClient();
  const insertData = toCompanyInsert(validated.data);

  // Temporary fallback until full auth is implemented
  insertData.user_id = null;

  const { data, error } = await client.from("companies").insert(insertData).select().single();

  if (error) throw handleSupabaseError(error, "createCompany");
  return data as Company;
}

/* ──────────────────────────────────────────────────────────────
   UPDATE COMPANY (Zod validated)
   ────────────────────────────────────────────────────────────── */
export async function updateCompany(
  id: string,
  updates: CompanyUpdate,
): Promise<Company> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("companies").update(updates).eq("id", id).select().single();

  if (error) throw handleSupabaseError(error, "updateCompany");
  revalidatePath(`/companies/${id}`, "page");
  return data as Company;
}

/* ──────────────────────────────────────────────────────────────
   DELETE COMPANY (soft or hard via user trash_bin_enabled)
   ────────────────────────────────────────────────────────────── */
export async function deleteCompany(id: string): Promise<TrashDeleteMode> {
  return deleteCompanyWithTrash(id);
}

/* ──────────────────────────────────────────────────────────────
   GET KPI SUMMARY
   ────────────────────────────────────────────────────────────── */
export async function getKpis(supabase: SupabaseClient): Promise<KPI[]> {
  const { data, error } = await supabase.from("companies").select("status").is("deleted_at", null);

  if (error) throw handleSupabaseError(error, "getKpis");

  const total = data.length;
  const won = data.filter((c) => c.status === "gewonnen").length;
  const lost = data.filter((c) => c.status === "verloren").length;
  const lead = data.filter((c) => c.status === "lead").length;

  return [
    { title: "Total Companies", value: total, changePercent: 0, subtitle: "Alle Unternehmen" },
    { title: "Gewonnen", value: won, changePercent: 12, subtitle: "Erfolgreich abgeschlossen" },
    { title: "Verloren", value: lost, changePercent: -8, subtitle: "Verlorene Opportunities" },
    { title: "Leads", value: lead, changePercent: 15, subtitle: "Aktive Leads" },
  ];
}

/* ──────────────────────────────────────────────────────────────
   CSV IMPORT
   ────────────────────────────────────────────────────────────── */
function validCoordOrNull(value: number | null | undefined, min: number, max: number): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

/** Best-effort: does not throw; import success must not depend on timeline writes. */
async function createCsvImportTimelineEntries(
  supabase: SupabaseClient,
  companyIds: string[],
): Promise<void> {
  if (companyIds.length === 0) {
    return;
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return;
    }

    const rows: TimelineEntryInsert[] = companyIds.map((companyId) => ({
      title: "CSV Import: Unternehmen importiert",
      content: null,
      activity_type: "csv_import",
      company_id: companyId,
      contact_id: null,
      user_id: user.id,
      created_by: user.id,
      updated_by: user.id,
    }));

    const { error } = await supabase.from("timeline").insert(rows);

    if (error !== null) {
      console.error("[createCsvImportTimelineEntries] timeline insert failed:", {
        code: error.code,
        message: error.message,
      });
    }
  } catch (err: unknown) {
    console.error("[createCsvImportTimelineEntries] unexpected error:", err);
  }
}

export async function importCompaniesFromCSV(
  rows: ParsedCompanyRow[]
): Promise<{
  imported: number;
  importedWithCoordinates: number;
  errors: string[];
  importBatch: string;
  companyIds: string[];
}> {
  const supabase = await createServerSupabaseClient();
  const importBatch = new Date().toISOString();

  try {
    const companiesToInsert: CompanyInsert[] = rows.map((row) => ({
      firmenname: row.firmenname,
      kundentyp: row.kundentyp,
      strasse: row.strasse ?? null,
      plz: row.plz ?? null,
      stadt: row.ort ?? null,
      bundesland: row.bundesland ?? null,
      land: row.land ?? null,
      telefon: row.telefon ?? null,
      website: row.website ?? null,
      email: row.email ?? null,
      lat: validCoordOrNull(row.lat, -90, 90),
      lon: validCoordOrNull(row.lon, -180, 180),
      osm: row.osm ?? null,
      wasserdistanz: row.wasser_distanz ?? null,
      wassertyp: row.wassertyp ?? null,
      status: "lead",
      user_id: null,
      rechtsform: null,
      firmentyp: null,
      value: null,
      notes: null,
      import_batch: importBatch,
    }));

    const importedWithCoordinates = companiesToInsert.filter(
      (row) => row.lat !== null && row.lon !== null,
    ).length;

    const { data, error } = await supabase
      .from("companies")
      .insert(companiesToInsert)
      .select();

    if (error) throw handleSupabaseError(error, "importCompaniesFromCSV");

    const companyIds = (data ?? []).map((row) => row.id);

    await createCsvImportTimelineEntries(supabase, companyIds);

    return {
      imported: data?.length || 0,
      importedWithCoordinates,
      errors: [],
      importBatch,
      companyIds,
    };
  } catch (error) {
    return {
      imported: 0,
      importedWithCoordinates: 0,
      errors: [error instanceof Error ? error.message : "Unbekannter Importfehler"],
      importBatch,
      companyIds: [],
    };
  }
}

/* ──────────────────────────────────────────────────────────────
   NOMINATIM GEOCODE (preview + selective apply)
   ────────────────────────────────────────────────────────────── */

const GEOCODE_BATCH_MAX = 50;
const GEOCODE_REQUEST_GAP_MS = 1100;

export type GeocodeBatchPreviewRow = {
  rowId: string;
  companyId: string | null;
  firmenname: string | null;
  addressLabel: string;
  currentLat: number | null;
  currentLon: number | null;
  suggestedLat: number | null;
  suggestedLon: number | null;
  confidence: GeocodeConfidence | null;
  importance: number | null;
  displayName: string | null;
  ok: boolean;
  message: string | null;
};

const geocodeBatchItemSchema = z
  .object({
    rowId: z.string().trim().min(1),
    companyId: z.string().uuid().optional(),
    firmenname: z.string().trim().optional(),
    strasse: z.string().trim().nullable().optional(),
    plz: z.string().trim().nullable().optional(),
    stadt: z.string().trim().nullable().optional(),
    land: z.string().trim().nullable().optional(),
    currentLat: z.number().finite().nullable().optional(),
    currentLon: z.number().finite().nullable().optional(),
  })
  .strict();

const geocodeCompanyBatchInputSchema = z
  .object({
    items: z.array(geocodeBatchItemSchema).min(1).max(GEOCODE_BATCH_MAX),
  })
  .strict();

function geocodeFailureMessage(reason: GeocodeFailureReason | null): string {
  switch (reason) {
    case "INCOMPLETE_ADDRESS":
      return "Adresse unvollständig: Bitte Straße oder PLZ sowie Ort angeben.";
    case "NETWORK_ERROR":
      return "Geocoding-Dienst vorübergehend nicht erreichbar.";
    case "INVALID_COORDINATE":
      return "Ungültige Koordinaten in der Antwort.";
    case "NO_RESULT":
      return "Kein Treffer für diese Adresse.";
    default:
      return "Geocoding fehlgeschlagen.";
  }
}

export type GeocodeCompanyBatchResult =
  | { ok: true; previewOnly: true; results: GeocodeBatchPreviewRow[] }
  | { ok: false; error: string };

export async function geocodeCompanyBatch(input: unknown): Promise<GeocodeCompanyBatchResult> {
  const parsed = geocodeCompanyBatchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe für Geocoding." };
  }

  const cache = new Map<string, GeocodeAddressResult>();
  const results: GeocodeBatchPreviewRow[] = [];

  for (let index = 0; index < parsed.data.items.length; index += 1) {
    if (index > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, GEOCODE_REQUEST_GAP_MS);
      });
    }

    const item = parsed.data.items[index];
    if (item === undefined) {
      continue;
    }

    const geo = await geocodeAddress(
      {
        strasse: item.strasse,
        plz: item.plz,
        stadt: item.stadt,
        land: item.land,
      },
      cache,
    );

    const currentLat =
      item.currentLat === undefined || item.currentLat === null ? null : item.currentLat;
    const currentLon =
      item.currentLon === undefined || item.currentLon === null ? null : item.currentLon;

    const addressParts = [
      item.strasse?.trim(),
      item.plz?.trim(),
      item.stadt?.trim(),
      item.land?.trim(),
    ].filter((part): part is string => typeof part === "string" && part.length > 0);
    const addressLabel = addressParts.length > 0 ? addressParts.join(", ") : "—";

    results.push({
      rowId: item.rowId,
      companyId: item.companyId ?? null,
      firmenname: item.firmenname ?? null,
      addressLabel,
      currentLat,
      currentLon,
      suggestedLat: geo.ok ? geo.lat : null,
      suggestedLon: geo.ok ? geo.lon : null,
      confidence: geo.confidence,
      importance: geo.importance,
      displayName: geo.displayName,
      ok: geo.ok,
      message: geo.ok ? null : geocodeFailureMessage(geo.reason),
    });
  }

  return { ok: true, previewOnly: true, results };
}

const applyGeocodeItemSchema = z
  .object({
    companyId: z.string().uuid().optional(),
    rowId: z.string().trim().min(1).optional(),
    suggestedLat: z.number().finite(),
    suggestedLon: z.number().finite(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.companyId === undefined && val.rowId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entweder companyId oder rowId ist erforderlich.",
        path: ["companyId"],
      });
    }
  });

const applyApprovedGeocodesInputSchema = z
  .object({
    items: z.array(applyGeocodeItemSchema).min(1),
  })
  .strict();

export type ApplyGeocodeItemResult =
  | {
      ok: true;
      companyId?: string;
      rowId?: string;
      lat: number;
      lon: number;
    }
  | {
      ok: false;
      companyId?: string;
      rowId?: string;
      error: string;
    };

export type ApplyApprovedGeocodesResult =
  | { ok: true; results: ApplyGeocodeItemResult[] }
  | { ok: false; error: string };

export async function applyApprovedGeocodes(input: unknown): Promise<ApplyApprovedGeocodesResult> {
  const parsed = applyApprovedGeocodesInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe für Koordinaten-Übernahme." };
  }

  const results: ApplyGeocodeItemResult[] = [];
  let wroteCompany = false;

  for (const item of parsed.data.items) {
    const lat = parseCoordinate(String(item.suggestedLat), "lat");
    const lon = parseCoordinate(String(item.suggestedLon), "lon");

    if (lat === undefined || lon === undefined) {
      results.push({
        ok: false,
        companyId: item.companyId,
        rowId: item.rowId,
        error: "Koordinaten außerhalb des gültigen Bereichs oder ungültig.",
      });
      continue;
    }

    if (item.companyId !== undefined) {
      try {
        await updateCompany(item.companyId, { lat, lon });
        wroteCompany = true;
        results.push({
          ok: true,
          companyId: item.companyId,
          lat,
          lon,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Update fehlgeschlagen.";
        results.push({
          ok: false,
          companyId: item.companyId,
          error: message,
        });
      }
      continue;
    }

    if (item.rowId !== undefined) {
      results.push({
        ok: true,
        rowId: item.rowId,
        lat,
        lon,
      });
      continue;
    }

    results.push({
      ok: false,
      error: "rowId oder companyId erforderlich.",
    });
  }

  if (wroteCompany) {
    revalidatePath("/companies", "page");
  }

  return { ok: true, results };
}
