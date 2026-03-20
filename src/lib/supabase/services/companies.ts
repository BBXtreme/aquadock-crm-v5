import { createServerSupabaseClient } from '../client';
import type { Company, CompanyInsert, CompanyUpdate } from '../database.types';

export async function getCompanies(): Promise<Company[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('companies').select('*');
  if (error) throw new Error(`Failed to fetch companies: ${error.message}`);
  return data ?? [];
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch company: ${error.message}`);
  return data ?? null;
}

export async function createCompany(company: CompanyInsert): Promise<Company> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('companies').insert(company).select().single();
  if (error) throw new Error(`Failed to create company: ${error.message}`);
  return data;
}

export async function updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update company: ${error.message}`);
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete company: ${error.message}`);
}
