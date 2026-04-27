/**
 * RLS-scoped queries for `user_notifications`. Safe to import from client components
 * (no nodemailer / SMTP). Server-only insert + email live in `in-app-notifications.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Database, UserNotification } from "@/types/database.types";

export type ListInAppNotificationsOptions = {
  limit?: number;
  beforeCreatedAt?: string;
};

/** Default page size for the Benachrichtigungen list (newest first). */
export const IN_APP_NOTIFICATIONS_PAGE_SIZE = 10;

export type ListNotificationsForUserPageOptions = {
  page: number;
  pageSize: number;
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

/**
 * Paginated list (newest first) with total count for UI pagination.
 */
export async function listNotificationsForUserPage(
  client: SupabaseClient<Database>,
  userId: string,
  options: ListNotificationsForUserPageOptions,
): Promise<{ rows: UserNotification[]; total: number }> {
  const pageSize = Math.min(100, Math.max(1, options.pageSize));
  const page = Math.max(0, Math.floor(options.page));
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await client
    .from("user_notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw handleSupabaseError(error, "listNotificationsForUserPage");
  }

  return {
    rows: data ?? [],
    total: count ?? 0,
  };
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

export { getInAppNotificationActionPath } from "@/lib/notifications/in-app-action-path";
