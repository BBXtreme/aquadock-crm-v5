import { handleSupabaseError } from "../utils";
import type { Company } from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all companies
 */
export async function getCompanies(client: SupabaseClient): Promise<Company[]> {
  const { data, error } = await client.from("companies").select("*");
  if (error) throw handleSupabaseError(error, "getCompanies");
  return (data ?? []) as Company[];
}

/**
 * Get company by ID
 */
export async function getCompanyById(
  id: string,
  client: SupabaseClient,
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getCompanyById");
  return (data as Company | null) ?? null;
}

/**
 * Create a new company
 */
export async function createCompany(
  company: Omit<Company, "id" | "created_at" | "updated_at">,
  client: SupabaseClient,
): Promise<Company> {
  const { data, error } = await client
    .from("companies")
    .insert(company)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createCompany");
  return data as Company;
}

/**
 * Update a company
 */
export async function updateCompany(
  id: string,
  updates: Partial<Omit<Company, "id" | "created_at" | "updated_at">>,
  client: SupabaseClient,
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateCompany");
  return (data as Company | null) ?? null;
}

/**
 * Delete a company
 */
export async function deleteCompany(
  id: string,
  client: SupabaseClient,
): Promise<boolean> {
  const { error } = await client.from("companies").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteCompany");
  return true;
}
