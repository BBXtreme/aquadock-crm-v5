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
import { DEFAULT_APPEARANCE_COLOR_SCHEME } from "@/lib/constants/theme";
import { createClient } from "@/lib/supabase/browser";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import {
  type AppearanceColorScheme,
  type AppearanceLocale,
  type AppearanceSettingsRecord,
  type AppearanceTheme,
  parseAppearanceColorScheme,
  parseAppearanceLocale,
  parseAppearanceTheme,
} from "@/lib/validations/appearance";
import { notificationPreferencesSchema } from "@/lib/validations/settings";
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
  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(NOTIFICATION_UI.toastValidationError);
  }
  await upsertNotificationPreferences(client, userId, parsed.data);
  return parsed.data;
}

export const APPEARANCE_SETTING_KEYS = {
  theme: "appearance_theme",
  locale: "appearance_locale",
  colorScheme: "appearance_color_scheme",
} as const;

/** Defaults when no rows exist in `user_settings` (or unauthenticated fallback). */
export const DEFAULT_APPEARANCE: AppearanceSettingsRecord = {
  theme: "system",
  locale: "de",
  colorScheme: DEFAULT_APPEARANCE_COLOR_SCHEME,
};

function rowValueToString(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
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

export async function loadAppearanceSettings(): Promise<AppearanceSettingsRecord | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const keys = [
    APPEARANCE_SETTING_KEYS.theme,
    APPEARANCE_SETTING_KEYS.locale,
    APPEARANCE_SETTING_KEYS.colorScheme,
  ] as const;

  const { data, error } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", [...keys]);

  if (error) throw handleSupabaseError(error, "loadAppearanceSettings");

  let theme: AppearanceTheme = DEFAULT_APPEARANCE.theme;
  let locale: AppearanceLocale = DEFAULT_APPEARANCE.locale;
  let colorScheme: AppearanceColorScheme = DEFAULT_APPEARANCE.colorScheme;

  for (const row of data ?? []) {
    const str = rowValueToString(row.value);
    if (str === null) continue;
    if (row.key === APPEARANCE_SETTING_KEYS.theme) {
      const parsed = parseAppearanceTheme(str.trim());
      if (parsed) theme = parsed;
    }
    if (row.key === APPEARANCE_SETTING_KEYS.locale) {
      const parsed = parseAppearanceLocale(str.trim());
      if (parsed) locale = parsed;
    }
    if (row.key === APPEARANCE_SETTING_KEYS.colorScheme) {
      const parsed = parseAppearanceColorScheme(str.trim());
      if (parsed) colorScheme = parsed;
    }
  }

  return { theme, locale, colorScheme };
}

export async function saveAppearanceTheme(theme: AppearanceTheme): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User ID is required for user settings");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: APPEARANCE_SETTING_KEYS.theme,
      value: theme,
    },
    { onConflict: "user_id,key" },
  );
  if (error) throw handleSupabaseError(error, "saveAppearanceTheme");
}

export async function saveAppearanceLocale(locale: AppearanceLocale): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User ID is required for user settings");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: APPEARANCE_SETTING_KEYS.locale,
      value: locale,
    },
    { onConflict: "user_id,key" },
  );
  if (error) throw handleSupabaseError(error, "saveAppearanceLocale");
}

export async function saveAppearanceColorScheme(colorScheme: AppearanceColorScheme): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User ID is required for user settings");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: APPEARANCE_SETTING_KEYS.colorScheme,
      value: colorScheme,
    },
    { onConflict: "user_id,key" },
  );
  if (error) throw handleSupabaseError(error, "saveAppearanceColorScheme");
}
