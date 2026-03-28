// src/lib/supabase/services/contacts.ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Contact, ContactInsert } from "../database.types";
import { handleSupabaseError } from "../utils";

/**
 * Get all contacts with joined company data
 */
export async function getContacts(
  client: SupabaseClient,
  options?: { page?: number; pageSize?: number; sortBy?: string; sortDesc?: boolean },
): Promise<{ data: Contact[]; total: number }> {
  let query = client.from("contacts").select("*, companies!company_id(firmenname)", { count: "exact" });

  if (options?.sortBy) {
    query = query.order(options.sortBy, { ascending: !options.sortDesc });
  }

  const pageSize = options?.pageSize || 25;
  const page = options?.page || 0;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw handleSupabaseError(error, "getContacts");

  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG] Raw contacts data sample:", data?.slice(0, 2));
  }

  return { data: (data ?? []) as Contact[], total: count || 0 };
}

/**
 * Get contact by ID
 */
export async function getContactById(id: string, client: SupabaseClient): Promise<Contact | null> {
  // Optimized for performance - auth filtering will be added later
  const { data, error } = await client
    .from("contacts")
    .select(
      "id, vorname, nachname, anrede, position, email, telefon, mobil, durchwahl, notes, company_id, is_primary, created_at, updated_at, companies!company_id(id, firmenname)",
    )
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getContactById");
  return (data as unknown as Contact | null) ?? null;
}

/**
 * Create a new contact
 */
export async function createContact(contact: ContactInsert, client: SupabaseClient): Promise<Contact> {
  const { data, error } = await client.from("contacts").insert(contact).select().single();
  if (error) throw handleSupabaseError(error, "createContact");
  return data as Contact;
}

/**
 * Update a contact
 */
export async function updateContact(id: string, updates: Partial<Contact>, client: SupabaseClient): Promise<Contact> {
  const { data, error } = await client.from("contacts").update(updates).eq("id", id).select().single();
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
