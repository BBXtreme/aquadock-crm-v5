import type { SupabaseClient } from "@supabase/supabase-js";

import type { TimelineEntry, TimelineEntryUpdate } from "../types";
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
