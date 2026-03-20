import { createServerSupabaseClient, handleSupabaseError } from "../client";
import { Database } from "../database.types";

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

export async function getAllCompanies(): Promise<Company[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, "getAllCompanies");
  }
}

export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "getCompanyById");
  }
}

export async function createCompany(company: CompanyInsert): Promise<Company> {
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

export async function updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "updateCompany");
  }
}

export async function deleteCompany(id: string): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    throw handleSupabaseError(error, "deleteCompany");
  }
}
