"use server";

/**
 * Server-side helpers for reminder / timeline detail routes: classify row as active
 * (`deleted_at` null), trashed (`deleted_at` set), or missing — same semantics as
 * `resolveCompanyDetail` / `resolveContactDetail` (fetch by id, then branch on `deleted_at`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Reminder, TimelineEntry } from "@/types/database.types";

const REMINDER_DETAIL_SELECT =
  "id, company_id, title, description, due_date, status, priority, assigned_to, completed_at, created_at, updated_at, created_by, updated_by, user_id, deleted_at, deleted_by";

const TIMELINE_DETAIL_SELECT =
  "id, company_id, contact_id, activity_type, title, content, user_name, created_at, created_by, updated_by, user_id, deleted_at, deleted_by";

export type ResolveReminderDetailResult =
  | { kind: "active"; reminder: Reminder }
  | { kind: "trashed" }
  | { kind: "missing" };

export type ResolveTimelineDetailResult =
  | { kind: "active"; entry: TimelineEntry }
  | { kind: "trashed" }
  | { kind: "missing" };

export async function resolveReminderDetail(
  id: string,
  supabase: SupabaseClient,
): Promise<ResolveReminderDetailResult> {
  const { data, error } = await supabase
    .from("reminders")
    .select(REMINDER_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveReminderDetail");

  if (data === null) {
    return { kind: "missing" };
  }

  if (data.deleted_at !== null && data.deleted_at !== undefined) {
    return { kind: "trashed" };
  }

  return { kind: "active", reminder: data as Reminder };
}

export async function resolveTimelineDetail(
  id: string,
  supabase: SupabaseClient,
): Promise<ResolveTimelineDetailResult> {
  const { data, error } = await supabase
    .from("timeline")
    .select(TIMELINE_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveTimelineDetail");

  if (data === null) {
    return { kind: "missing" };
  }

  if (data.deleted_at !== null && data.deleted_at !== undefined) {
    return { kind: "trashed" };
  }

  return { kind: "active", entry: data as TimelineEntry };
}
