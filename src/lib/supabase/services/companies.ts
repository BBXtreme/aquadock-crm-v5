// src/lib/supabase/services/companies.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedCompanyRow } from "../../utils/csv-import";
import { createClient } from "../browser";
import type { Company, CompanyInsert, CompanyUpdate, Contact } from "../database.types";
import { handleSupabaseError } from "../utils";

export type CompanyForOpenMap = Company & { contacts?: Contact[] };

export async function getCompaniesForOpenMap(supabase: SupabaseClient): Promise<CompanyForOpenMap[]> {
  const { data, error } = await supabase.from("companies").select("*");
  if (error) throw handleSupabaseError(error, "getCompaniesForOpenMap");
  return data ?? [];
}

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
  } = {},
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

  if (statusFilters?.length) {
    query = query.in("status", statusFilters);
  }

  if (kundentypFilters?.length) {
    query = query.in("kundentyp", kundentypFilters);
  }

  if (firmentypFilters?.length) {
    query = query.in("firmentyp", firmentypFilters);
  }

  if (landFilters?.length) {
    query = query.in("land", landFilters);
  }

  if (sortBy) {
    query = query.order(sortBy, { ascending: !sortDesc });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw handleSupabaseError(error, "getCompanies");
  }

  return { data: data || [], total: count || 0 };
}

export async function getCompanyById(id: string, supabase: SupabaseClient): Promise<Company> {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();

  if (error) {
    throw handleSupabaseError(error, "getCompanyById");
  }

  return data;
}

export async function createCompany(company: CompanyInsert, supabase?: SupabaseClient): Promise<Company> {
  const supabaseClient = supabase || createClient();

  // Temporary fallback until auth is implemented
  company.user_id = null;

  // Log the full payload before insert
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG] Creating company with payload:", JSON.stringify(company, null, 2));
  }

  const { data, error } = await supabaseClient.from("companies").insert(company).select().single();

  if (error) {
    throw handleSupabaseError(error, "createCompany");
  }

  return data;
}

export async function updateCompany(id: string, updates: CompanyUpdate, supabase?: SupabaseClient): Promise<Company> {
  const supabaseClient = supabase || createClient();
  const { data, error } = await supabaseClient.from("companies").update(updates).eq("id", id).select().single();

  if (error) {
    throw handleSupabaseError(error, "updateCompany");
  }

  return data;
}

export async function deleteCompany(id: string, supabase?: SupabaseClient): Promise<void> {
  const supabaseClient = supabase || createClient();
  const { error } = await supabaseClient.from("companies").delete().eq("id", id);

  if (error) {
    throw handleSupabaseError(error, "deleteCompany");
  }
}

export async function importCompaniesFromCSV(rows: ParsedCompanyRow[]): Promise<{
  imported: number;
  errors: string[];
  importBatch: string;
}> {
  const supabase = createClient();
  const importBatch = new Date().toISOString();

  try {
    const companiesToInsert: CompanyInsert[] = rows.map((row: ParsedCompanyRow) => ({
      firmenname: row.firmenname,
      kundentyp: row.kundentyp,
      strasse: row.strasse,
      plz: row.plz,
      stadt: row.ort, // Map ort to stadt if needed
      bundesland: row.bundesland,
      land: row.land,
      telefon: row.telefon,
      website: row.website,
      email: row.email,
      lat: row.lat,
      lon: row.lon,
      osm: row.osm,
      wasserdistanz: row.wasser_distanz,
      wassertyp: row.wassertyp,
      status: "lead",
      user_id: null,
      rechtsform: null,
      firmentyp: null,
      value: null,
    }));

    const { data, error } = await supabase.from("companies").insert(companiesToInsert).select();

    if (error) {
      throw handleSupabaseError(error, "importCompaniesFromCSV");
    }

    return {
      imported: data?.length || 0,
      errors: [],
      importBatch,
    };
  } catch (error) {
    return {
      imported: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      importBatch,
    };
  }
}
