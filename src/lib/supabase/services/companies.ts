// src/lib/supabase/services/companies.ts
// This file contains functions for managing companies in the Supabase database.
// It includes functions to get companies with pagination and filtering, get by ID,
// create new entries, update existing entries, delete entries, and import from CSV.
// The functions use the Supabase client to interact with the database
// and handle errors using a utility function.
// The code is designed to be reusable across different parts of the app
// that need to access or modify company data.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedCompanyRow } from "../../utils/csv-import";
import { createClient } from "../browser-client";
import type { Company, CompanyInsert, CompanyUpdate, Contact, KPI } from "../database.types";
import { handleSupabaseError } from "../db-error-utils";

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
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, firmenname, status, kundentyp, firmentyp, rechtsform, value, strasse, plz, stadt, bundesland, land, telefon, email, website, lat, lon, osm, wasserdistanz, wassertyp, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error) {
      console.error("getCompanyById error:", error);
      throw handleSupabaseError(error, "getCompanyById");
    }

    return data;
  } catch (err) {
    console.error("getCompanyById unexpected error:", err);
    throw err;
  }
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

export async function getKpis(supabase: SupabaseClient): Promise<KPI[]> {
  const { data, error } = await supabase.from("companies").select("status");
  if (error) throw handleSupabaseError(error, "getKpis");

  const total = data.length;
  const won = data.filter((c) => c.status === "gewonnen").length;
  const lost = data.filter((c) => c.status === "verloren").length;
  const lead = data.filter((c) => c.status === "lead").length;

  return [
    { title: "Total Companies", value: total, changePercent: 0, subtitle: "Total companies in system" },
    { title: "Won", value: won, changePercent: 10, subtitle: "Successfully closed deals" },
    { title: "Lost", value: lost, changePercent: -5, subtitle: "Lost opportunities" },
    { title: "Leads", value: lead, changePercent: 15, subtitle: "Active leads" },
  ];
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
