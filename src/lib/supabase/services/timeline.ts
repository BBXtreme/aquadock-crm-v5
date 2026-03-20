import { handleSupabaseError } from "../utils";
import type {
  TimelineEntry,
  TimelineEntryInsert,
  TimelineEntryUpdate,
} from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all timeline entries with joined company data
 */
export async function getTimeline(client: SupabaseClient): Promise<TimelineEntry[]> {
  const { data, error } = await client
    .from("timeline")
    .select("*, companies(firmenname)");
  if (error) throw handleSupabaseError(error, "getTimeline");
  return (data ?? []) as TimelineEntry[];
}

/**
 * Get timeline entry by ID
 */
export async function getTimelineEntryById(
  id: string,
  client: SupabaseClient,
): Promise<TimelineEntry | null> {
  const { data, error } = await client
    .from("timeline")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getTimelineEntryById");
  return (data as TimelineEntry | null) ?? null;
}

/**
 * Create a new timeline entry
 */
export async function createTimelineEntry(
  entry: TimelineEntryInsert,
  client: SupabaseClient,
): Promise<TimelineEntry> {
  const { data, error } = await client
    .from("timeline")
    .insert(entry)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createTimelineEntry");
  return data as TimelineEntry;
}

/**
 * Update a timeline entry
 */
export async function updateTimelineEntry(
  id: string,
  updates: TimelineEntryUpdate,
  client: SupabaseClient,
): Promise<TimelineEntry> {
  const { data, error } = await client
    .from("timeline")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateTimelineEntry");
  return data as TimelineEntry;
}

/**
 * Delete a timeline entry
 */
export async function deleteTimelineEntry(
  id: string,
  client: SupabaseClient,
): Promise<void> {
  const { error } = await client.from("timeline").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteTimelineEntry");
}
