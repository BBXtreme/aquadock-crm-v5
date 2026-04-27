"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import { saveNotificationPreferencesFromInput, upsertAdminInAppGlobalFeedEnabled } from "@/lib/services/user-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const saveAdminGlobalInAppFeedInputSchema = z.boolean();

export async function saveNotificationPreferencesAction(input: unknown): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  await saveNotificationPreferencesFromInput(supabase, user.id, input);
}

/**
 * Admin-only: toggle receiving a copy of all users’ in-app notifications in this admin’s feed.
 */
export async function saveAdminGlobalInAppFeedAction(input: unknown): Promise<void> {
  const user = await requireAdmin();
  if (user.role !== "admin") {
    throw new Error("Nur für Administratoren");
  }
  const enabled = saveAdminGlobalInAppFeedInputSchema.parse(input);
  const supabase = await createServerSupabaseClient();
  await upsertAdminInAppGlobalFeedEnabled(supabase, user.id, enabled);
}
