import {
  createServerSupabaseClient,
  handleSupabaseError,
} from "../server-client";
import type { Contact, ContactInsert, ContactUpdate } from "../database.types";

/**
 * Get all contacts with joined company data
 */
export async function getContacts(
  client = createServerSupabaseClient(),
): Promise<Contact[]> {
  const { data, error } = await client
    .from("contacts")
    .select("*, companies(firmenname)");
  if (error) throw handleSupabaseError(error, "getContacts");
  return data ?? [];
}

/**
 * Get contact by ID
 */
export async function getContactById(
  id: string,
  client = createServerSupabaseClient(),
): Promise<Contact | null> {
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getContactById");
  return data ?? null;
}

/**
 * Create a new contact
 */
export async function createContact(
  contact: ContactInsert,
  client = createServerSupabaseClient(),
): Promise<Contact> {
  const { data, error } = await client
    .from("contacts")
    .insert(contact)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createContact");
  return data;
}

/**
 * Update a contact
 */
export async function updateContact(
  id: string,
  updates: ContactUpdate,
  client = createServerSupabaseClient(),
): Promise<Contact> {
  const { data, error } = await client
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateContact");
  return data;
}

/**
 * Delete a contact
 */
export async function deleteContact(
  id: string,
  client = createServerSupabaseClient(),
): Promise<void> {
  const { error } = await client.from("contacts").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteContact");
}
