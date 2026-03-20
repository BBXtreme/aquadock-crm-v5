import { createServerSupabaseClient, handleSupabaseError } from "../server-client";
import type { Company } from "../database.types";

/**
 * Get all companies
 */
export async function getCompanies(): Promise<Company[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from("companies").select("*");
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    throw handleSupabaseError(error, "getCompanies");
  }
}

/**
 * Get company by ID
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data ?? null;
  } catch (error) {
    throw handleSupabaseError(error, "getCompanyById");
  }
}

/**
 * Create a new company
 */
export async function createCompany(
  company: Omit<Company, "id" | "created_at" | "updated_at">,
): Promise<Company> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .insert(company)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "createCompany");
  }
}

/**
 * Update a company
 */
export async function updateCompany(
  id: string,
  updates: Partial<Omit<Company, "id" | "created_at" | "updated_at">>,
): Promise<Company | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data ?? null;
  } catch (error) {
    throw handleSupabaseError(error, "updateCompany");
  }
}

/**
 * Delete a company
 */
export async function deleteCompany(id: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    throw handleSupabaseError(error, "deleteCompany");
  }
}
