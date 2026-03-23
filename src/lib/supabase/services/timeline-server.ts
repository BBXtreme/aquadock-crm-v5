import { createServerSupabaseClient } from "../server";
import type { TimelineEntry, TimelineEntryInsert } from "../types";
import { handleSupabaseError } from "../utils";

/**
 * Get all timeline entries for a specific user
 */
export async function getAllTimelineForUser(userId: string): Promise<TimelineEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .select(`
      *,
      companies!left (id, firmenname),
      contacts!left (id, vorname || ' ' || nachname as name, email, telefon)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw handleSupabaseError(error, "Failed to load timeline");
  return data ?? [];
}

/**
 * Create a new timeline entry. Supports contact_id.
 */
export async function createTimelineEntry(
  values: TimelineEntryInsert & { user_id: string }
): Promise<TimelineEntry> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .insert(values)
    .select(`
      *,
      companies!left (id, firmenname),
      contacts!left (id, vorname || ' ' || nachname as name)
    `)
    .single();

  if (error) throw handleSupabaseError(error);
  return data;
}

/**
 * Update a timeline entry
 */
export async function updateTimelineEntry(id: string, updates: Partial<TimelineEntry>): Promise<TimelineEntry> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .update(updates)
    .eq("id", id)
    .select(`
      *,
      companies(firmenname)
    `)
    .single();

  if (error) throw handleSupabaseError(error, "Failed to update timeline entry");
  return data;
}

/**
 * Delete a timeline entry
 */
export async function deleteTimelineEntry(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("timeline")
    .delete()
    .eq("id", id);

  if (error) throw handleSupabaseError(error, "Failed to delete timeline entry");
}
