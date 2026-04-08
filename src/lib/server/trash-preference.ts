import { fetchTrashBinPreference } from "@/lib/services/user-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Whether the current session user uses soft-delete (trash) vs hard delete.
 * Defaults to true when the setting row is missing.
 */
export async function getTrashBinEnabledForCurrentUser(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return true;
  }
  const { trashBinEnabled } = await fetchTrashBinPreference(supabase, user.id);
  return trashBinEnabled;
}
