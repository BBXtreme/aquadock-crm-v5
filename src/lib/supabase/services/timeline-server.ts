import { createServerSupabaseClient } from "../server";
import type { TimelineEntry, TimelineEntryInsert } from "../database.types";
import { handleSupabaseError } from "../utils";

/**
 * Get all timeline entries for a specific user
 */
export async function getAllTimelineForUser(_userId: string): Promise<TimelineEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .select(`
      *,
      companies!left (id, firmenname),
      contacts!left (id, vorname, nachname, email, telefon, position)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw handleSupabaseError(error, "Failed to load timeline");
  return data ?? [];
}

/**
 * Create new timeline entry. Supports company_id and contact_id.
 */
export async function createTimelineEntry(values: TimelineEntryInsert & { user_id: string }): Promise<TimelineEntry> {
  console.log("[createTimelineEntry] Insert values:", values);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .insert(values)
    .select(`
      *,
      companies!left (id, firmenname),
      contacts!left (id, vorname, nachname, email, telefon, position)
    `)
    .single();

  if (error) {
    console.error("[createTimelineEntry] Supabase insert failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      valuesAttempted: values,
    });
    throw handleSupabaseError(error, "createTimelineEntry");
  }
  return data;
}

/**
 * Update a timeline entry
 */
export async function updateTimelineEntry(id: string, updates: Partial<TimelineEntry>): Promise<TimelineEntry> {
  console.log("Updating timeline entry", id, "with:", updates);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("timeline")
    .update(updates)
    .eq("id", id)
    .select(`
      *,
      companies(firmenname),
      contacts!left (id, vorname, nachname, email, telefon, position)
    `)
    .single();

  if (error) {
    console.error("Supabase error in updateTimelineEntry:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw handleSupabaseError(error, "Failed to update timeline entry");
  }
  return data;
}

/**
 * Delete a timeline entry
 */
export async function deleteTimelineEntry(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("timeline").delete().eq("id", id);

  if (error) {
    console.error("Supabase error in deleteTimelineEntry:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw handleSupabaseError(error, "Failed to delete timeline entry");
  }
}
