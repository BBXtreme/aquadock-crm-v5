"use server";

import { requireUser } from "@/lib/auth/require-user";
import { saveNotificationPreferencesFromInput } from "@/lib/services/user-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveNotificationPreferencesAction(input: unknown): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  await saveNotificationPreferencesFromInput(supabase, user.id, input);
}
