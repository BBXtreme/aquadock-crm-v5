"use server";

import { requireUser } from "@/lib/auth/require-user";
import { saveTrashBinPreferenceFromInput } from "@/lib/services/user-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveTrashBinPreferenceAction(input: unknown): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  await saveTrashBinPreferenceFromInput(supabase, user.id, input);
}
