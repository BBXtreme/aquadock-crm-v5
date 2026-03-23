import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "../server";
import type { TimelineEntry, TimelineEntryInsert, TimelineEntryUpdate } from "../types";
import { handleSupabaseError } from "../utils";

/**
 * Get all timeline entries with joined company data
 */
export async function getTimeline(client: SupabaseClient): Promise<TimelineEntry[]> {
  const { data, error } = await client.from("timeline").select("*, companies!company_id (firmenname)");
  if (error) throw handleSupabaseError(error, "getTimeline");
  return (data ?? []) as TimelineEntry[];
}

/**
 * Get timeline entry by ID
 */
export async function getTimelineEntryById(id: string, client: SupabaseClient): Promise<TimelineEntry | null> {
  const { data, error } = await client.from("timeline").select("*").eq("id", id).single();
  if (error) throw handleSupabaseError(error, "getTimelineEntryById");
  return (data as TimelineEntry | null) ?? null;
}

/**
 * Update a timeline entry
 */
export async function updateTimelineEntry(
  id: string,
  updates: TimelineEntryUpdate,
  client: SupabaseClient,
): Promise<TimelineEntry> {
  const { data, error } = await client.from("timeline").update(updates).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateTimelineEntry");
  return data as TimelineEntry;
}

/**
 * Get all timeline entries for a specific user
 */
export async function getAllTimelineForUser(userId: string): Promise<TimelineEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .select(`
      *,
      companies(firmenname, status, kundentyp)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw handleSupabaseError(error, "Cannot load timeline");
  return data ?? [];
}

/**
 * Create a new timeline entry
 */
export async function createTimelineEntry(
  values: Omit<TimelineEntryInsert, "id" | "created_at" | "user_id"> & { user_id: string }
): Promise<TimelineEntry> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .insert(values)
    .select(`
      *,
      companies(firmenname)
    `)
    .single();

  if (error) throw handleSupabaseError(error, "Cannot create timeline entry");
  return data;
}

/**
 * Delete a timeline entry
 */
export async function deleteTimelineEntry(id: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("timeline")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);   // extra safety

  if (error) throw handleSupabaseError(error, "Cannot delete timeline entry");
}
