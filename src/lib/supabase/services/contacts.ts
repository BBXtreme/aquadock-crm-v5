import { createServerSupabaseClient, handleSupabaseError } from "../client";
import { Database } from "../database.types";

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

export async function getAllContacts(): Promise<Contact[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, "getAllContacts");
  }
}

export async function getContactsByCompany(companyId: string): Promise<Contact[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, "getContactsByCompany");
  }
}

export async function getContactById(id: string): Promise<Contact | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "getContactById");
  }
}

export async function createContact(contact: ContactInsert): Promise<Contact> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("contacts")
      .insert(contact)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "createContact");
  }
}

export async function updateContact(id: string, updates: ContactUpdate): Promise<Contact> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "updateContact");
  }
}

export async function deleteContact(id: string): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    throw handleSupabaseError(error, "deleteContact");
  }
}
