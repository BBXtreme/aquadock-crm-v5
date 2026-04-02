// src/lib/supabase/services/contacts.ts
// This file contains functions for managing contacts in the Supabase database.
// It includes functions to get all contacts, get by ID, create new entries,
// update existing entries, and delete entries.
// The functions use the Supabase client to interact with the database
// and handle errors using a utility function.
// The code is designed to be reusable across different parts of the
// app that need to access or modify contacts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Contact, ContactInsert } from "@/types/database.types";

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
  try {
    const { data, error } = await client
      .from("contacts")
      .select(
        "id, vorname, nachname, anrede, position, email, telefon, mobil, durchwahl, notes, company_id, is_primary, created_at, updated_at",
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("getContactById error:", error);
      throw handleSupabaseError(error, "getContactById");
    }

    return data as Contact | null;
  } catch (err) {
    console.error("getContactById unexpected error:", err);
    throw err;
  }
}

/**
 * Create a new contact
 */
export async function createContact(contact: ContactInsert, client?: SupabaseClient): Promise<Contact> {
  const supabaseClient = client || createClient();

  // Temporary fallback until auth is implemented
  contact.user_id = null;

  // Log the exact payload for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG] Creating contact with payload:", JSON.stringify(contact, null, 2));
    if (contact.user_id) {
      console.log("[DEBUG] Contact user_id:", contact.user_id);
    }
  }

  const { data, error } = await supabaseClient.from("contacts").insert(contact).select().single();
  if (error) throw handleSupabaseError(error, "createContact");
  return data as Contact;
}

/**
 * Update a contact
 */
export async function updateContact(id: string, updates: Partial<Contact>, client?: SupabaseClient): Promise<Contact> {
  const supabaseClient = client || createClient();
  const { data, error } = await supabaseClient.from("contacts").update(updates).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateContact");
  return data as Contact;
}

/**
 * Delete a contact
 */
export async function deleteContact(id: string, client?: SupabaseClient): Promise<void> {
  const supabaseClient = client || createClient();
  const { error } = await supabaseClient.from("contacts").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteContact");
}
