// src/lib/services/user-settings.ts
// This file contains functions for managing user settings in the
// Supabase database. It includes functions to get and save user-specific
// settings such as column order for the companies table, as well as
// more general functions to get and upsert any user setting based on a key.
// The settings are stored in a "user_settings" table, which has a
// structure that includes a user_id, key, and value, allowing for
// flexible storage of various types of settings for each user.
// The functions use the Supabase client to interact with the database
// and handle errors using a utility function.
// The code is designed to be reusable across different parts of the
// app that need to access or modify user settings.

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_SETTING_KEYS,
  NOTIFICATION_SETTING_KEYS_LIST,
  NOTIFICATION_UI,
} from "@/lib/constants/notifications";
import { createClient } from "@/lib/supabase/browser";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { safeParseNotificationPreferences } from "@/lib/validations/settings";
import type { Database, UserSetting, UserSettingInsert } from "@/types/database.types";
import type { Json } from "@/types/supabase";

function jsonToBoolean(value: Json | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export type NotificationPreferencesState = {
  pushEnabled: boolean;
  emailEnabled: boolean;
};

export async function fetchNotificationPreferences(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<NotificationPreferencesState> {
  const { data, error } = await client
    .from("user_settings")
    .select("key, value")
    .eq("user_id", userId)
    .in("key", [...NOTIFICATION_SETTING_KEYS_LIST]);

  if (error) throw handleSupabaseError(error, "fetchNotificationPreferences");

  let pushEnabled: boolean = NOTIFICATION_DEFAULTS.pushEnabled;
  let emailEnabled: boolean = NOTIFICATION_DEFAULTS.emailEnabled;
  for (const row of data ?? []) {
    if (row.key === NOTIFICATION_SETTING_KEYS.push) {
      pushEnabled = jsonToBoolean(row.value, NOTIFICATION_DEFAULTS.pushEnabled);
    }
    if (row.key === NOTIFICATION_SETTING_KEYS.email) {
      emailEnabled = jsonToBoolean(row.value, NOTIFICATION_DEFAULTS.emailEnabled);
    }
  }
  return { pushEnabled, emailEnabled };
}

export async function upsertNotificationPreferences(
  client: SupabaseClient<Database>,
  userId: string,
  prefs: NotificationPreferencesState,
): Promise<void> {
  const rows = [
    { user_id: userId, key: NOTIFICATION_SETTING_KEYS.push, value: prefs.pushEnabled },
    { user_id: userId, key: NOTIFICATION_SETTING_KEYS.email, value: prefs.emailEnabled },
  ];
  for (const row of rows) {
    const { error } = await client.from("user_settings").upsert(row, { onConflict: "user_id,key" });
    if (error) throw handleSupabaseError(error, "upsertNotificationPreferences");
  }
}

/**
 * Validates with Zod, then persists. Single entry point for writes from server actions.
 */
export async function saveNotificationPreferencesFromInput(
  client: SupabaseClient<Database>,
  userId: string,
  input: unknown,
): Promise<NotificationPreferencesState> {
  const parsed = safeParseNotificationPreferences(input);
  if (!parsed.success) {
    throw new Error(NOTIFICATION_UI.toastValidationError);
  }
  await upsertNotificationPreferences(client, userId, parsed.data);
  return parsed.data;
}

export async function getUserColumnOrder(): Promise<string[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("value")
    .eq("key", "companies_column_order")
    .single();

  if (error && error.code !== "PGRST116") throw handleSupabaseError(error, "getUserColumnOrder");
  return data?.value ?? null;
}

export async function saveUserColumnOrder(order: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("user_settings").upsert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    key: "companies_column_order",
    value: order,
  });

  if (error) throw handleSupabaseError(error, "saveUserColumnOrder");
}

export async function getUserSettings(userId: string): Promise<UserSetting[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId);
  if (error) throw handleSupabaseError(error, "getUserSettings");
  return data || [];
}

export async function upsertUserSetting(setting: UserSettingInsert): Promise<UserSetting> {
  if (!setting.user_id) throw new Error("User ID is required for user settings");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(setting, { onConflict: "user_id,key" })
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "upsertUserSetting");
  return data;
}
