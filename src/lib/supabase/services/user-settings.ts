import { createClient } from "@/lib/supabase/browser";
import type { UserSetting, UserSettingInsert } from "@/lib/supabase/database.types";
import { handleSupabaseError } from "@/lib/supabase/utils";

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
