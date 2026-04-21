import { createTimelineEntry } from "@/lib/services/timeline";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveActivityTypeForTimelinePersist } from "@/lib/validations/timeline";

export type AuthenticatedTimelineCreateInput = {
  title: string;
  content?: string | null;
  activity_type?: string;
  company_id?: string | null;
  contact_id?: string | null;
};

/** Shared server-only path for timeline inserts (used by the server action and POST /api/timeline). */
export async function createAuthenticatedTimelineEntry(input: AuthenticatedTimelineCreateInput) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  return createTimelineEntry(
    {
      title: input.title,
      content: input.content ?? null,
      activity_type: resolveActivityTypeForTimelinePersist(input.activity_type, input.title, input.content ?? null),
      company_id: input.company_id ?? null,
      contact_id: input.contact_id ?? null,
      user_id: user.id,
      created_by: user.id,
      updated_by: user.id,
    },
    supabase,
  );
}
