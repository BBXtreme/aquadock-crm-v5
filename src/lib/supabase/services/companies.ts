import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";

import type { Company, CompanyInsert } from "../types";
import { handleSupabaseError } from "../utils";

/**
 * Get all companies
 */
export async function getCompanies(
  client?: SupabaseClient,
  options?: { limit?: number; offset?: number; statusFilter?: string },
): Promise<Company[]> {
  const supabase = client || createClient();

  let query = supabase.from("companies").select("*");

  if (options?.statusFilter) {
    query = query.eq("status", options.statusFilter);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 1000) - 1);
  }

  const { data, error } = await query;

  if (process.env.NODE_ENV === "development") {
    console.group("getCompanies");
    console.log("Query options:", options);
    console.log("Result count:", data?.length);
    console.groupEnd();
  }

  if (error) throw handleSupabaseError(error, "getCompanies");

  return (data ?? []) as Company[];
}

/**
 * Get company by ID
 */
export async function getCompanyById(id: string, client: SupabaseClient): Promise<Company | null> {
  const { data, error } = await client.from("companies").select("*").eq("id", id).single();
  if (error) throw handleSupabaseError(error, "getCompanyById");
  return (data as Company | null) ?? null;
}

/**
 * Create a new company
 */
export async function createCompany(values: CompanyInsert): Promise<Company> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert(values)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createCompany");
  return data;
}

/**
 * Update a company
 */
export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateCompany");
  return data;
}

/**
 * Delete a company
 */
export async function deleteCompany(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteCompany");
}
