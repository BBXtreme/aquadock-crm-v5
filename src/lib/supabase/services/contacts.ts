import { handleSupabaseError } from "../utils";
import type { Contact, ContactInsert, ContactUpdate } from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all contacts with joined company data
 */
export async function getContacts(client: SupabaseClient): Promise<Contact[]> {
  const { data, error } = await client
    .from("contacts")
    .select("*, companies!company_id(firmenname)");
  if (error) throw handleSupabaseError(error, "getContacts");
  return (data ?? []) as Contact[];
}

/**
 * Get contact by ID
 */
export async function getContactById(
  id: string,
  client: SupabaseClient,
): Promise<Contact | null> {
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getContactById");
  return (data as Contact | null) ?? null;
}

/**
 * Create a new contact
 */
export async function createContact(
  contact: ContactInsert,
  client: SupabaseClient,
): Promise<Contact> {
  const { data, error } = await client
    .from("contacts")
    .insert(contact)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createContact");
  return data as Contact;
}

/**
 * Update a contact
 */
export async function updateContact(
  id: string,
  updates: ContactUpdate,
  client: SupabaseClient,
): Promise<Contact> {
  const { data, error } = await client
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateContact");
  return data as Contact;
}

/**
 * Delete a contact
 */
export async function deleteContact(id: string, client: SupabaseClient): Promise<void> {
  const { error } = await client.from("contacts").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteContact");
}
