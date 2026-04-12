// Reads optional AI enrichment flags from `user_settings` (EAV).

import type { GatewayModelId } from "@ai-sdk/gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveEnrichmentUsedToday, enrichmentUtcDayKey } from "@/lib/ai/enrichment-rate-limit";
import {
  AI_ENRICHMENT_ADDRESS_FOCUS_KEY,
  AI_ENRICHMENT_DAILY_LIMIT_KEY,
  AI_ENRICHMENT_DEFAULT_DAILY_LIMIT,
  AI_ENRICHMENT_ENABLED_KEY,
  AI_ENRICHMENT_LAST_RESET_DATE_KEY,
  AI_ENRICHMENT_MODEL_PREFERENCE_KEY,
  AI_ENRICHMENT_PRIMARY_MODEL_KEY,
  AI_ENRICHMENT_SECONDARY_MODEL_KEY,
  AI_ENRICHMENT_USED_TODAY_KEY,
} from "@/lib/constants/ai-enrichment-user-settings";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Database } from "@/types/database.types";
import type { Json } from "@/types/supabase";

const DEFAULT_PRIMARY_GATEWAY_MODEL: GatewayModelId = "anthropic/claude-sonnet-4.6";
const DEFAULT_SECONDARY_GATEWAY_MODEL: GatewayModelId = "xai/grok-4.1-fast-non-reasoning";

/** Vercel AI Gateway ids selectable in CRM settings (validated EAV). */
export const ENRICHMENT_GATEWAY_MODEL_ID_CHOICES = [
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-opus-4.6",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5-mini",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash",
  "xai/grok-4.1-fast-non-reasoning",
  "xai/grok-4.1-fast-reasoning",
  "xai/grok-4-fast-non-reasoning",
] as const;

const ALLOWED_GATEWAY_MODEL_SET = new Set<string>(ENRICHMENT_GATEWAY_MODEL_ID_CHOICES);

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

function jsonToNonNegativeInt(value: Json | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function jsonToDayString(value: Json | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

const MODEL_PREFERENCES = ["auto", "claude", "grok", "single"] as const;

export type AiEnrichmentModelPreference = (typeof MODEL_PREFERENCES)[number];

function jsonToModelPreference(value: Json | undefined, fallback: AiEnrichmentModelPreference): AiEnrichmentModelPreference {
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "auto" || t === "claude" || t === "grok" || t === "single") {
      return t;
    }
  }
  return fallback;
}

function jsonToGatewayModelId(value: Json | undefined, fallback: GatewayModelId): GatewayModelId {
  if (typeof value !== "string") {
    return fallback;
  }
  const t = value.trim();
  if (ALLOWED_GATEWAY_MODEL_SET.has(t)) {
    return t as GatewayModelId;
  }
  return fallback;
}

/**
 * Per-user AI enrichment flags from `user_settings` (EAV).
 * `primaryGatewayModelId` is the user-chosen **structuring** model (phase 2: JSON from research digest).
 * Web search (phase 1 / Perplexity) uses a fixed fast model in the gateway, not this id.
 * Cost/speed for company enrichment is driven by the modal Fast vs Full web search toggle in the gateway, not a separate settings flag.
 * `modelPreference` and `secondaryGatewayModelId` remain in EAV for compatibility; runtime fallback for
 * structuring uses `resolveEnrichmentGrokGatewayModelId()` from the gateway (not always the stored secondary).
 */
export type AiEnrichmentPolicy = {
  enabled: boolean;
  dailyLimit: number;
  modelPreference: AiEnrichmentModelPreference;
  addressFocusPrioritize: boolean;
  /** Successful runs counted for the current UTC day (rollover when last reset date ≠ today). */
  usedToday: number;
  primaryGatewayModelId: GatewayModelId;
  secondaryGatewayModelId: GatewayModelId;
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
 * Values reflect persisted EAV; gateway routing may still normalize fallback models at runtime.
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
      AI_ENRICHMENT_PRIMARY_MODEL_KEY,
      AI_ENRICHMENT_SECONDARY_MODEL_KEY,
      AI_ENRICHMENT_ADDRESS_FOCUS_KEY,
      AI_ENRICHMENT_USED_TODAY_KEY,
      AI_ENRICHMENT_LAST_RESET_DATE_KEY,
    ]);

  if (error) throw handleSupabaseError(error, "fetchAiEnrichmentPolicy");

  let enabled = true;
  let dailyLimit = parseDefaultDailyLimitFromEnv();
  let modelPreference: AiEnrichmentModelPreference = "auto";
  let primaryGatewayModelId: GatewayModelId = DEFAULT_PRIMARY_GATEWAY_MODEL;
  let secondaryGatewayModelId: GatewayModelId = DEFAULT_SECONDARY_GATEWAY_MODEL;
  let addressFocusPrioritize = false;
  let storedUsed = 0;
  let lastReset = "";

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
    if (row.key === AI_ENRICHMENT_PRIMARY_MODEL_KEY) {
      primaryGatewayModelId = jsonToGatewayModelId(row.value, primaryGatewayModelId);
    }
    if (row.key === AI_ENRICHMENT_SECONDARY_MODEL_KEY) {
      secondaryGatewayModelId = jsonToGatewayModelId(row.value, secondaryGatewayModelId);
    }
    if (row.key === AI_ENRICHMENT_ADDRESS_FOCUS_KEY) {
      addressFocusPrioritize = jsonToBoolean(row.value, false);
    }
    if (row.key === AI_ENRICHMENT_USED_TODAY_KEY) {
      storedUsed = jsonToNonNegativeInt(row.value);
    }
    if (row.key === AI_ENRICHMENT_LAST_RESET_DATE_KEY) {
      lastReset = jsonToDayString(row.value);
    }
  }

  const today = enrichmentUtcDayKey();
  const usedToday = effectiveEnrichmentUsedToday(storedUsed, lastReset, today);

  return {
    enabled,
    dailyLimit,
    modelPreference,
    addressFocusPrioritize,
    usedToday,
    primaryGatewayModelId,
    secondaryGatewayModelId,
  };
}

export { DEFAULT_PRIMARY_GATEWAY_MODEL, DEFAULT_SECONDARY_GATEWAY_MODEL };
