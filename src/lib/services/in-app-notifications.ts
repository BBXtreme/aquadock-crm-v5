// Server-only: in-app `user_notifications` (inserts via service role; reads via user JWT + RLS)
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import {
  type CreateInAppNotificationInput,
  createInAppNotificationInputSchema,
} from "@/lib/validations/notification";
import type { Database, UserNotification } from "@/types/database.types";

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

/**
 * Insert a notification for another user. Skips when actor and recipient are the same.
 * Returns `null` on skip, on dedupe conflict (23505), or if service role env is missing (throws from createAdminClient).
 */
export async function createInAppNotification(
  input: CreateInAppNotificationInput,
): Promise<UserNotification | null> {
  const parsed = createInAppNotificationInputSchema.parse(input);
  if (parsed.actorUserId != null && parsed.actorUserId === parsed.userId) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .insert({
      user_id: parsed.userId,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body ?? null,
      payload: parsed.payload,
      actor_user_id: parsed.actorUserId ?? null,
      dedupe_key: parsed.dedupeKey ?? null,
    })
    .select()
    .single();

  if (error) {
    if (isPostgresUniqueViolation(error) && parsed.dedupeKey) {
      return null;
    }
    throw handleSupabaseError(error, "createInAppNotification");
  }

  if (data == null) {
    throw new Error("createInAppNotification: no row returned");
  }
  return data;
}

export type ListInAppNotificationsOptions = {
  limit?: number;
  beforeCreatedAt?: string;
};

/**
 * List notifications for the given user, newest first. Caller must use a Supabase client scoped to that user.
 */
export async function listNotificationsForUser(
  client: SupabaseClient<Database>,
  userId: string,
  options: ListInAppNotificationsOptions = {},
): Promise<UserNotification[]> {
  const limit = options.limit ?? 50;
  let q = client
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.beforeCreatedAt !== undefined) {
    q = q.lt("created_at", options.beforeCreatedAt);
  }

  const { data, error } = await q;
  if (error) {
    throw handleSupabaseError(error, "listNotificationsForUser");
  }
  return data ?? [];
}

export async function getUnreadCount(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw handleSupabaseError(error, "getUnreadCount");
  }
  return count ?? 0;
}

export async function markAsRead(
  client: SupabaseClient<Database>,
  userId: string,
  id: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("user_notifications")
    .update({ read_at: now })
    .eq("id", id)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw handleSupabaseError(error, "markAsRead");
  }
}

export async function markAllRead(client: SupabaseClient<Database>, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("user_notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw handleSupabaseError(error, "markAllRead");
  }
}

export type { CreateInAppNotificationInput };
