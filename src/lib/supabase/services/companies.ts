import type { SupabaseClient } from "@supabase/supabase-js";

import type { Company, CompanyInsert, CompanyUpdate } from "../database.types";
import { handleSupabaseError } from "../utils";

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

export async function createCompany(company: CompanyInsert, supabase: SupabaseClient): Promise<Company> {
  const { data, error } = await supabase.from("companies").insert(company).select().single();

  if (error) {
    throw handleSupabaseError(error, "createCompany");
  }

  return data;
}

export async function updateCompany(id: string, updates: CompanyUpdate, supabase: SupabaseClient): Promise<Company> {
  const { data, error } = await supabase.from("companies").update(updates).eq("id", id).select().single();

  if (error) {
    throw new Error(`Update failed: ${error.message || error.details || "Unknown error"}`);
  }

  return data;
}

export async function deleteCompany(id: string, supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from("companies").delete().eq("id", id);

  if (error) {
    throw handleSupabaseError(error, "deleteCompany");
  }
}
