// src/lib/supabase/services/timeline.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimelineEntry, TimelineEntryInsert, TimelineEntryUpdate } from "@/types/database.types";

export async function createTimelineEntry(
  data: Omit<TimelineEntryInsert, 'id' | 'created_at' | 'updated_at'>,
  supabase: SupabaseClient
): Promise<TimelineEntry> {
  const { data: result, error } = await supabase
    .from("timeline")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateTimelineEntry(
  id: string,
  data: TimelineEntryUpdate,
  supabase: SupabaseClient
): Promise<TimelineEntry> {
  const { data: result, error } = await supabase
    .from("timeline")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getTimelineEntries(userId: string, supabase: SupabaseClient): Promise<TimelineEntry[]> {
  const { data, error } = await supabase
    .from("timeline")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
