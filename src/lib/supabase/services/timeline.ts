import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimelineEntry, TimelineEntryInsert, TimelineEntryUpdate } from "@/types/database.types";

export async function createTimelineEntry(
  data: Omit<TimelineEntryInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>,
  supabase: SupabaseClient
): Promise<TimelineEntry> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const insertData = { ...data, user_id: user.id };
  const { data: result, error } = await supabase
    .from("timeline")
    .insert(insertData)
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

export async function deleteTimelineEntry(id: string, supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from("timeline").delete().eq("id", id);
  if (error) throw error;
}

export async function getTimelineEntries(userId: string, supabase: SupabaseClient): Promise<TimelineEntry[]> {
  const { data, error } = await supabase
    .from("timeline")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
