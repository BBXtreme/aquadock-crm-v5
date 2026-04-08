import { OPENMAP_USER_SETTING_KEYS } from "@/lib/constants/openmap-user-settings";
import { createClient } from "@/lib/supabase/browser";

export async function fetchOpenmapUserPreferenceRows(): Promise<{ key: string; value: unknown }[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", [...OPENMAP_USER_SETTING_KEYS]);

  if (error) throw error;
  return (data ?? []).map((row) => ({ key: row.key, value: row.value }));
}
