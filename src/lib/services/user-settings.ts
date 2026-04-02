// src/lib/supabase/services/user-settings.ts
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

import { createClient } from "@/lib/supabase/browser";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { UserSetting, UserSettingInsert } from "@/types/database.types";

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
