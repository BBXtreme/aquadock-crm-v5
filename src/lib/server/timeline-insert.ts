import type { SupabaseClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/lib/services/in-app-notifications";
import { createTimelineEntry } from "@/lib/services/timeline";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeDisplay } from "@/lib/utils/data-format";
import { resolveActivityTypeForTimelinePersist } from "@/lib/validations/timeline";
import type { Database, TimelineEntry } from "@/types/database.types";

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

  const entry = await createTimelineEntry(
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

  await maybeNotifyCompanyOwnerOnNewTimeline(supabase, user.id, entry);
  return entry;
}

async function maybeNotifyCompanyOwnerOnNewTimeline(
  supabase: SupabaseClient<Database>,
  actorUserId: string,
  entry: TimelineEntry,
) {
  const companyId = entry.company_id;
  if (companyId == null) {
    return;
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("user_id, firmenname")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (companyError) {
    console.error("[createAuthenticatedTimelineEntry] company lookup failed", companyError);
    return;
  }

  if (company == null) {
    return;
  }

  const ownerId = company.user_id;
  if (ownerId == null || ownerId === actorUserId) {
    return;
  }

  const companyLabel = safeDisplay(company.firmenname, "Unternehmen");

  try {
    await createInAppNotification({
      type: "timeline_on_company",
      userId: ownerId,
      title: "Neuer Timeline-Eintrag",
      body: companyLabel,
      payload: { companyId, timelineId: entry.id },
      actorUserId,
      dedupeKey: `timeline_on_company:${entry.id}`,
    });
  } catch (err) {
    console.error("[createAuthenticatedTimelineEntry] in-app notification failed", err);
  }
}
