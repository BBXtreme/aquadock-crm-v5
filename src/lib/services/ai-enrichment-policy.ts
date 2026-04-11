// Reads optional AI enrichment flags from `user_settings` (EAV).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_ENRICHMENT_ADDRESS_FOCUS_KEY,
  AI_ENRICHMENT_DAILY_LIMIT_KEY,
  AI_ENRICHMENT_DEFAULT_DAILY_LIMIT,
  AI_ENRICHMENT_ENABLED_KEY,
  AI_ENRICHMENT_MODEL_PREFERENCE_KEY,
} from "@/lib/constants/ai-enrichment-user-settings";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Database } from "@/types/database.types";
import type { Json } from "@/types/supabase";

function jsonToBoolean(value: Json | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function jsonToPositiveInt(value: Json | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return fallback;
}

const MODEL_PREFERENCES = ["auto", "claude", "grok"] as const;

export type AiEnrichmentModelPreference = (typeof MODEL_PREFERENCES)[number];

function jsonToModelPreference(value: Json | undefined, fallback: AiEnrichmentModelPreference): AiEnrichmentModelPreference {
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "auto" || t === "claude" || t === "grok") {
      return t;
    }
  }
  return fallback;
}

export type AiEnrichmentPolicy = {
  enabled: boolean;
  dailyLimit: number;
  modelPreference: AiEnrichmentModelPreference;
  addressFocusPrioritize: boolean;
};

function parseDefaultDailyLimitFromEnv(): number {
  const raw = process.env.AI_ENRICHMENT_DAILY_LIMIT_DEFAULT?.trim();
  if (!raw) return AI_ENRICHMENT_DEFAULT_DAILY_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return AI_ENRICHMENT_DEFAULT_DAILY_LIMIT;
  return n;
}

/**
 * Loads per-user enrichment policy. Missing rows → enabled with default daily limit.
 */
export async function fetchAiEnrichmentPolicy(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<AiEnrichmentPolicy> {
  const { data, error } = await client
    .from("user_settings")
    .select("key, value")
    .eq("user_id", userId)
    .in("key", [
      AI_ENRICHMENT_ENABLED_KEY,
      AI_ENRICHMENT_DAILY_LIMIT_KEY,
      AI_ENRICHMENT_MODEL_PREFERENCE_KEY,
      AI_ENRICHMENT_ADDRESS_FOCUS_KEY,
    ]);

  if (error) throw handleSupabaseError(error, "fetchAiEnrichmentPolicy");

  let enabled = true;
  let dailyLimit = parseDefaultDailyLimitFromEnv();
  let modelPreference: AiEnrichmentModelPreference = "auto";
  let addressFocusPrioritize = false;

  for (const row of data ?? []) {
    if (row.key === AI_ENRICHMENT_ENABLED_KEY) {
      enabled = jsonToBoolean(row.value, true);
    }
    if (row.key === AI_ENRICHMENT_DAILY_LIMIT_KEY) {
      dailyLimit = jsonToPositiveInt(row.value, dailyLimit);
    }
    if (row.key === AI_ENRICHMENT_MODEL_PREFERENCE_KEY) {
      modelPreference = jsonToModelPreference(row.value, modelPreference);
    }
    if (row.key === AI_ENRICHMENT_ADDRESS_FOCUS_KEY) {
      addressFocusPrioritize = jsonToBoolean(row.value, false);
    }
  }

  return { enabled, dailyLimit, modelPreference, addressFocusPrioritize };
}
