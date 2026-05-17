"use server";

import { z } from "zod";
import {
  AI_ENRICHMENT_ADDRESS_FOCUS_KEY,
  AI_ENRICHMENT_DAILY_LIMIT_KEY,
  AI_ENRICHMENT_ENABLED_KEY,
  AI_ENRICHMENT_MODEL_PREFERENCE_KEY,
  AI_ENRICHMENT_PERPLEXITY_FAST_MAX_RESULTS_KEY,
  AI_ENRICHMENT_PERPLEXITY_FAST_RECENCY_KEY,
  AI_ENRICHMENT_PRIMARY_MODEL_KEY,
  AI_ENRICHMENT_SECONDARY_MODEL_KEY,
} from "@/lib/constants/ai-enrichment-user-settings";
import { getAiEnrichmentModels } from "@/lib/constants/ai-models";
import {
  type AiEnrichmentPolicy,
  DEFAULT_SECONDARY_GATEWAY_MODEL,
  fetchAiEnrichmentPolicy,
} from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";



/** Single user-selected gateway model; server persists auto + default secondary for Server Action merge compatibility. */
const perplexityFastRecencySchema = z.enum(["month", "year"]);

const aiEnrichmentSettingsUpdateSchema = z
  .object({
    enabled: z.boolean(),
    dailyLimit: z.number().int().min(1).max(500),
    primaryGatewayModelId: z.string().min(1),
    addressFocusPrioritize: z.boolean(),
    perplexityFastMaxResults: z.number().int().min(1).max(8),
    perplexityFastRecency: perplexityFastRecencySchema,
  })
  .strict();

export type AiEnrichmentSettingsUpdate = z.infer<typeof aiEnrichmentSettingsUpdateSchema>;

export type AiEnrichmentSettingsSnapshot = Pick<
  AiEnrichmentPolicy,
  | "enabled"
  | "dailyLimit"
  | "modelPreference"
  | "addressFocusPrioritize"
  | "usedToday"
  | "primaryGatewayModelId"
  | "secondaryGatewayModelId"
  | "crmSearchLocale"
  | "perplexityFastMaxResults"
  | "perplexityFastRecency"
>;

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
      primaryGatewayModelId: policy.primaryGatewayModelId,
      secondaryGatewayModelId: policy.secondaryGatewayModelId,
      crmSearchLocale: policy.crmSearchLocale,
      perplexityFastMaxResults: policy.perplexityFastMaxResults,
      perplexityFastRecency: policy.perplexityFastRecency,
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

  // Validate that the selected model exists in the current registry (DB + env + fallback)
  const availableModels = await getAiEnrichmentModels();
  const isValidModel = availableModels.some((m) => m.id === parsed.data.primaryGatewayModelId);
  if (!isValidModel) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  const rows = [
    { user_id: user.id, key: AI_ENRICHMENT_ENABLED_KEY, value: parsed.data.enabled },
    { user_id: user.id, key: AI_ENRICHMENT_DAILY_LIMIT_KEY, value: parsed.data.dailyLimit },
    { user_id: user.id, key: AI_ENRICHMENT_MODEL_PREFERENCE_KEY, value: "auto" as const },
    { user_id: user.id, key: AI_ENRICHMENT_PRIMARY_MODEL_KEY, value: parsed.data.primaryGatewayModelId },
    { user_id: user.id, key: AI_ENRICHMENT_SECONDARY_MODEL_KEY, value: DEFAULT_SECONDARY_GATEWAY_MODEL },
    { user_id: user.id, key: AI_ENRICHMENT_ADDRESS_FOCUS_KEY, value: parsed.data.addressFocusPrioritize },
    { user_id: user.id, key: AI_ENRICHMENT_PERPLEXITY_FAST_MAX_RESULTS_KEY, value: parsed.data.perplexityFastMaxResults },
    { user_id: user.id, key: AI_ENRICHMENT_PERPLEXITY_FAST_RECENCY_KEY, value: parsed.data.perplexityFastRecency },
  ];

  for (const row of rows) {
    const { error } = await supabase.from("user_settings").upsert(row, { onConflict: "user_id,key" });
    if (error) {
      return { ok: false, error: "SAVE_FAILED" };
    }
  }

  return { ok: true };
}
