import { handleSupabaseError } from "../utils";
import type {
  TimelineEntry,
  TimelineEntryInsert,
  TimelineEntryUpdate,
} from "../database.types";

/**
 * Get all timeline entries with joined company data
 */
export async function getTimeline(client: any): Promise<TimelineEntry[]> {
  const { data, error } = await client
    .from("timeline")
    .select("*, companies(firmenname)");
  if (error) throw handleSupabaseError(error, "getTimeline");
  return data ?? [];
}

/**
 * Get timeline entry by ID
 */
export async function getTimelineEntryById(
  id: string,
  client: any,
): Promise<TimelineEntry | null> {
  const { data, error } = await client
    .from("timeline")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getTimelineEntryById");
  return data ?? null;
}

/**
 * Create a new timeline entry
 */
export async function createTimelineEntry(
  entry: TimelineEntryInsert,
  client: any,
): Promise<TimelineEntry> {
  const { data, error } = await client
    .from("timeline")
    .insert(entry)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createTimelineEntry");
  return data;
}

/**
 * Update a timeline entry
 */
export async function updateTimelineEntry(
  id: string,
  updates: TimelineEntryUpdate,
  client: any,
): Promise<TimelineEntry> {
  const { data, error } = await client
    .from("timeline")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateTimelineEntry");
  return data;
}

/**
 * Delete a timeline entry
 */
export async function deleteTimelineEntry(
  id: string,
  client: any,
): Promise<void> {
  const { error } = await client.from("timeline").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteTimelineEntry");
}
