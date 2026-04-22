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
import type { Contact, ContactInsert, Profile } from "@/types/database.types";

export type ContactListRow = Contact & {
  companies?: { firmenname: string } | null;
  owner_profile?: Pick<Profile, "display_name"> | null;
};

async function resolveContactOwnerUserId(
  supabase: SupabaseClient,
  companyId: string | null | undefined,
  currentUserId: string,
): Promise<string> {
  if (companyId == null || companyId === "") {
    return currentUserId;
  }
  const { data, error } = await supabase
    .from("companies")
    .select("user_id")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveContactOwnerUserId");

  const ownerId = data?.user_id;
  if (ownerId != null && ownerId !== "") {
    return ownerId;
  }
  return currentUserId;
}

/**
 * Get all contacts with joined company data
 */
export async function getContacts(
  client: SupabaseClient,
  options?: { page?: number; pageSize?: number; sortBy?: string; sortDesc?: boolean },
): Promise<{ data: ContactListRow[]; total: number }> {
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

  const rows = (data ?? []) as ContactListRow[];
  const ownerIds = [
    ...new Set(
      rows
        .map((r) => r.user_id)
        .filter((id): id is string => id !== null && id !== undefined && id.length > 0),
    ),
  ];
  if (ownerIds.length === 0) {
    return { data: rows.map((r) => ({ ...r, owner_profile: null })), total: count || 0 };
  }
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, display_name")
    .in("id", ownerIds);
  if (profilesError) throw handleSupabaseError(profilesError, "getContacts.profiles");
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return {
    data: rows.map((row) => ({
      ...row,
      owner_profile: row.user_id ? (map.get(row.user_id) ?? null) : null,
    })),
    total: count || 0,
  };
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
      "id, vorname, nachname, anrede, position, email, telefon, mobil, durchwahl, notes, company_id, is_primary, created_at, updated_at, deleted_at, user_id",
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
      "id, vorname, nachname, anrede, position, email, telefon, mobil, durchwahl, notes, company_id, is_primary, created_at, updated_at, user_id",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "getContactById");
  return data as Contact | null;
}

/**
 * Create a new contact (browser client; prefer {@link createContactAction} from forms).
 */
export async function createContact(contact: ContactInsert, client?: SupabaseClient): Promise<Contact> {
  const supabaseClient = client || createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();
  if (authError || user == null) {
    throw new Error("Unauthorized");
  }
  const ownerUserId = await resolveContactOwnerUserId(supabaseClient, contact.company_id ?? null, user.id);
  const row: ContactInsert = {
    ...contact,
    user_id: ownerUserId,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data, error } = await supabaseClient.from("contacts").insert(row).select().single();
  if (error) throw handleSupabaseError(error, "createContact");
  return data as Contact;
}

/**
 * Update a contact (browser client; prefer {@link updateContactAction} from forms).
 */
export async function updateContact(id: string, updates: Partial<Contact>, client?: SupabaseClient): Promise<Contact> {
  const supabaseClient = client || createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();
  if (authError || user == null) {
    throw new Error("Unauthorized");
  }
  const patch: Partial<Contact> = { ...updates };
  if (Object.hasOwn(updates, "company_id")) {
    patch.user_id = await resolveContactOwnerUserId(supabaseClient, updates.company_id ?? null, user.id);
    patch.updated_by = user.id;
  }
  const { data, error } = await supabaseClient.from("contacts").update(patch).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateContact");
  return data as Contact;
}
