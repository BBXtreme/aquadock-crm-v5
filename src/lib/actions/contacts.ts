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
  let query = client
    .from("contacts")
    .select("*, companies!company_id(firmenname)", { count: "exact" })
    .is("deleted_at", null);

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

  return { data: (data ?? []) as Contact[], total: count || 0 };
}

/**
 * Resolve contact detail: active list row, Papierkorb, or missing.
 */
export type ResolveContactDetailResult =
  | { kind: "active"; contact: Contact }
  | { kind: "trashed" }
  | { kind: "missing" };

export async function resolveContactDetail(
  id: string,
  client: SupabaseClient,
): Promise<ResolveContactDetailResult> {
  const { data, error } = await client
    .from("contacts")
    .select(
      "id, vorname, nachname, anrede, position, email, telefon, mobil, durchwahl, notes, company_id, is_primary, created_at, updated_at, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveContactDetail");

  if (data === null) {
    return { kind: "missing" };
  }

  if (data.deleted_at !== null && data.deleted_at !== undefined) {
    return { kind: "trashed" };
  }

  return { kind: "active", contact: data as Contact };
}

/**
 * Get contact by ID (active rows only; null if missing or trashed)
 */
export async function getContactById(id: string, client: SupabaseClient): Promise<Contact | null> {
  const { data, error } = await client
    .from("contacts")
    .select(
      "id, vorname, nachname, anrede, position, email, telefon, mobil, durchwahl, notes, company_id, is_primary, created_at, updated_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "getContactById");
  return data as Contact | null;
}

/**
 * Create a new contact
 */
export async function createContact(contact: ContactInsert, client?: SupabaseClient): Promise<Contact> {
  const supabaseClient = client || createClient();

  // Temporary fallback until auth is implemented
  contact.user_id = null;

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

