import { createServerClient } from "../server";
import type { TimelineEntry, TimelineEntryInsert } from "../types";
import { handleSupabaseError } from "../utils";

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
