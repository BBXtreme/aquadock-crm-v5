import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerClient } from "../server";
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
 * Get all timeline entries for a specific user
 */
export async function getAllTimelineForUser(userId: string): Promise<TimelineEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("timeline")
    .select(`
      *,
      companies!inner(firmenname, status, kundentyp)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw handleSupabaseError(error, "Failed to load timeline");
  return data ?? [];
}

/**
 * Create a new timeline entry
 */
export async function createTimelineEntry(values: TimelineEntryInsert & { user_id: string }): Promise<TimelineEntry> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("timeline")
    .insert(values)
    .select(`
      *,
      companies!inner(firmenname)
    `)
    .single();

  if (error) throw handleSupabaseError(error, "Failed to create timeline entry");
  return data;
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
 * Delete a timeline entry
 */
export async function deleteTimelineEntry(id: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("timeline")
    .delete()
    .eq("id", id);

  if (error) throw handleSupabaseError(error, "Failed to delete timeline entry");
}
