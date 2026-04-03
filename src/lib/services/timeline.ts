import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TimelineEntryWithJoins } from "@/types/database.types";

export async function getTimelineEntries(companyId?: string): Promise<TimelineEntryWithJoins[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("timeline")
    .select(`
      *,
      companies (
        firmenname,
        status,
        kundentyp
      ),
      contacts (
        vorname,
        nachname,
        position,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function deleteTimelineEntry(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("timeline").delete().eq("id", id);

  if (error) throw error;
}
