"use server";

import { z } from "zod";
import {
  AI_ENRICHMENT_ADDRESS_FOCUS_KEY,
  AI_ENRICHMENT_DAILY_LIMIT_KEY,
  AI_ENRICHMENT_ENABLED_KEY,
  AI_ENRICHMENT_MODEL_PREFERENCE_KEY,
} from "@/lib/constants/ai-enrichment-user-settings";
import { fetchAiEnrichmentPolicy } from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const aiEnrichmentSettingsUpdateSchema = z
  .object({
    enabled: z.boolean(),
    dailyLimit: z.number().int().min(1).max(500),
    modelPreference: z.enum(["auto", "claude", "grok"]),
    addressFocusPrioritize: z.boolean(),
  })
  .strict();

export type AiEnrichmentSettingsUpdate = z.infer<typeof aiEnrichmentSettingsUpdateSchema>;

export type AiEnrichmentSettingsSnapshot = {
  enabled: boolean;
  dailyLimit: number;
  modelPreference: "auto" | "claude" | "grok";
  addressFocusPrioritize: boolean;
  usedToday: number;
};

export async function getAiEnrichmentSettingsSnapshot(): Promise<
  { ok: true; data: AiEnrichmentSettingsSnapshot } | { ok: false; error: "NOT_AUTHENTICATED" }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "NOT_AUTHENTICATED" };
  }
  const policy = await fetchAiEnrichmentPolicy(supabase, user.id);
  return {
    ok: true,
    data: {
      enabled: policy.enabled,
      dailyLimit: policy.dailyLimit,
      modelPreference: policy.modelPreference,
      addressFocusPrioritize: policy.addressFocusPrioritize,
      usedToday: policy.usedToday,
    },
  };
}

export async function updateAiEnrichmentSettings(
  input: unknown,
): Promise<
  { ok: true } | { ok: false; error: "NOT_AUTHENTICATED" | "INVALID_INPUT" | "SAVE_FAILED" }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "NOT_AUTHENTICATED" };
  }
  const parsed = aiEnrichmentSettingsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  const rows = [
    { user_id: user.id, key: AI_ENRICHMENT_ENABLED_KEY, value: parsed.data.enabled },
    { user_id: user.id, key: AI_ENRICHMENT_DAILY_LIMIT_KEY, value: parsed.data.dailyLimit },
    { user_id: user.id, key: AI_ENRICHMENT_MODEL_PREFERENCE_KEY, value: parsed.data.modelPreference },
    { user_id: user.id, key: AI_ENRICHMENT_ADDRESS_FOCUS_KEY, value: parsed.data.addressFocusPrioritize },
  ];

  for (const row of rows) {
    const { error } = await supabase.from("user_settings").upsert(row, { onConflict: "user_id,key" });
    if (error) {
      return { ok: false, error: "SAVE_FAILED" };
    }
  }

  return { ok: true };
}
