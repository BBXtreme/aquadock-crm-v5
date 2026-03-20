import { handleSupabaseError } from "../utils";
import type { Company } from "../database.types";

/**
 * Get all companies
 */
export async function getCompanies(client: any): Promise<Company[]> {
  const { data, error } = await client.from("companies").select("*");
  if (error) throw handleSupabaseError(error, "getCompanies");
  return data ?? [];
}

/**
 * Get company by ID
 */
export async function getCompanyById(
  id: string,
  client: any,
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getCompanyById");
  return data ?? null;
}

/**
 * Create a new company
 */
export async function createCompany(
  company: Omit<Company, "id" | "created_at" | "updated_at">,
  client: any,
): Promise<Company> {
  const { data, error } = await client
    .from("companies")
    .insert(company)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createCompany");
  return data;
}

/**
 * Update a company
 */
export async function updateCompany(
  id: string,
  updates: Partial<Omit<Company, "id" | "created_at" | "updated_at">>,
  client: any,
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateCompany");
  return data ?? null;
}

/**
 * Delete a company
 */
export async function deleteCompany(id: string, client: any): Promise<boolean> {
  const { error } = await client.from("companies").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteCompany");
  return true;
}
