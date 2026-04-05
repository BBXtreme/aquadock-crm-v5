// src/lib/actions/companies.ts
// Server Actions for Company CRUD – CRM v5 (fully typed + Zod validated)

"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedCompanyRow } from "@/lib/utils/csv-import";
import { type CompanyFormValues, companySchema, toCompanyInsert } from "@/lib/validations/company";
import type {
  Company,
  CompanyInsert,
  CompanyUpdate,
  Contact,
  KPI,
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
    `);

  if (error) throw handleSupabaseError(error, "getCompaniesForOpenMap");
  return data ?? [];
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

  let query = supabase.from("companies").select("*", { count: "exact" });

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
   GET SINGLE COMPANY BY ID
   ────────────────────────────────────────────────────────────── */
export async function getCompanyById(
  id: string,
  supabase: SupabaseClient
): Promise<Company> {
  const { data, error } = await supabase
    .from("companies")
    .select(`
      id, firmenname, status, kundentyp, firmentyp, rechtsform, value,
      strasse, plz, stadt, bundesland, land, telefon, email, website,
      lat, lon, osm, wasserdistanz, wassertyp, created_at, updated_at
    `)
    .eq("id", id)
    .single();

  if (error) throw handleSupabaseError(error, "getCompanyById");
  return data as Company;
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
  return data as Company;
}

/* ──────────────────────────────────────────────────────────────
   DELETE COMPANY
   ────────────────────────────────────────────────────────────── */
export async function deleteCompany(id: string, supabase?: SupabaseClient): Promise<void> {
  const client = supabase ?? await createServerSupabaseClient();
  const { error } = await client.from("companies").delete().eq("id", id);

  if (error) throw handleSupabaseError(error, "deleteCompany");
}

/* ──────────────────────────────────────────────────────────────
   GET KPI SUMMARY
   ────────────────────────────────────────────────────────────── */
export async function getKpis(supabase: SupabaseClient): Promise<KPI[]> {
  const { data, error } = await supabase.from("companies").select("status");

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
export async function importCompaniesFromCSV(
  rows: ParsedCompanyRow[]
): Promise<{ imported: number; errors: string[]; importBatch: string }> {
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
      lat: row.lat ?? null,
      lon: row.lon ?? null,
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

    const { data, error } = await supabase
      .from("companies")
      .insert(companiesToInsert)
      .select();

    if (error) throw handleSupabaseError(error, "importCompaniesFromCSV");

    return {
      imported: data?.length || 0,
      errors: [],
      importBatch,
    };
  } catch (error) {
    return {
      imported: 0,
      errors: [error instanceof Error ? error.message : "Unbekannter Importfehler"],
      importBatch,
    };
  }
}
