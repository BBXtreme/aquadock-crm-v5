import { createServerSupabaseClient } from "../client";
import type { Company, CompanyInsert, CompanyUpdate } from "../database.types";

/**
 * Get all companies
 */
export async function getCompanies(
  client = createServerSupabaseClient(),
): Promise<Company[]> {
  const { data, error } = await client.from("companies").select("*");
  if (error) throw new Error(`Failed to fetch companies: ${error.message}`);
  return data ?? [];
}

/**
 * Get company by ID
 */
export async function getCompanyById(
  id: string,
  client = createServerSupabaseClient(),
): Promise<Company | null> {
  const { data, error } = await client
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Failed to fetch company: ${error.message}`);
  return data ?? null;
}

/**
 * Create a new company
 */
export async function createCompany(
  company: CompanyInsert,
  client = createServerSupabaseClient(),
): Promise<Company> {
  const { data, error } = await client
    .from("companies")
    .insert(company)
    .select()
    .single();
  if (error) throw new Error(`Failed to create company: ${error.message}`);
  return data;
}

/**
 * Update a company
 */
export async function updateCompany(
  id: string,
  updates: CompanyUpdate,
  client = createServerSupabaseClient(),
): Promise<Company> {
  const { data, error } = await client
    .from("companies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update company: ${error.message}`);
  return data;
}

/**
 * Delete a company
 */
export async function deleteCompany(
  id: string,
  client = createServerSupabaseClient(),
): Promise<void> {
  const { error } = await client.from("companies").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete company: ${error.message}`);
}
