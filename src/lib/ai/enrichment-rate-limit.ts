// Per-user daily enrichment usage in `user_settings` (EAV), UTC day boundary.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_ENRICHMENT_LAST_RESET_DATE_KEY,
  AI_ENRICHMENT_USED_TODAY_KEY,
} from "@/lib/constants/ai-enrichment-user-settings";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Database } from "@/types/database.types";
import type { Json } from "@/types/supabase";

export function enrichmentUtcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Effective runs counted for `todayUtc` (rollover when last reset date differs). */
export function effectiveEnrichmentUsedToday(
  storedUsed: number,
  lastResetDate: string,
  todayUtc: string,
): number {
  const t = todayUtc.trim();
  const l = lastResetDate.trim();
  if (l !== t) {
    return 0;
  }
  if (!Number.isFinite(storedUsed) || storedUsed < 0) {
    return 0;
  }
  return Math.min(Math.floor(storedUsed), 1_000_000);
}

function jsonToNonNegativeInt(value: Json | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return 0;
}

function jsonToDayString(value: Json | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

async function readUsageRows(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ storedUsed: number; lastReset: string }> {
  const { data, error } = await client
    .from("user_settings")
    .select("key, value")
    .eq("user_id", userId)
    .in("key", [AI_ENRICHMENT_USED_TODAY_KEY, AI_ENRICHMENT_LAST_RESET_DATE_KEY]);

  if (error) {
    throw handleSupabaseError(error, "readEnrichmentUsage");
  }

  let storedUsed = 0;
  let lastReset = "";
  for (const row of data ?? []) {
    if (row.key === AI_ENRICHMENT_USED_TODAY_KEY) {
      storedUsed = jsonToNonNegativeInt(row.value);
    }
    if (row.key === AI_ENRICHMENT_LAST_RESET_DATE_KEY) {
      lastReset = jsonToDayString(row.value);
    }
  }
  return { storedUsed, lastReset };
}

export async function enrichmentUsageRemaining(
  client: SupabaseClient<Database>,
  userId: string,
  dailyLimit: number,
): Promise<number> {
  if (dailyLimit <= 0) {
    return 0;
  }
  const today = enrichmentUtcDayKey();
  const { storedUsed, lastReset } = await readUsageRows(client, userId);
  const usedToday = effectiveEnrichmentUsedToday(storedUsed, lastReset, today);
  return Math.max(0, dailyLimit - usedToday);
}

/** Reserves slots if the daily cap allows; persists to `user_settings` (RLS-scoped). */
export async function tryCommitEnrichmentSlots(
  client: SupabaseClient<Database>,
  userId: string,
  slots: number,
  dailyLimit: number,
): Promise<boolean> {
  if (slots <= 0) {
    return true;
  }
  if (dailyLimit <= 0) {
    return false;
  }
  try {
    const today = enrichmentUtcDayKey();
    const { storedUsed, lastReset } = await readUsageRows(client, userId);
    const effectiveUsed = effectiveEnrichmentUsedToday(storedUsed, lastReset, today);
    if (effectiveUsed + slots > dailyLimit) {
      return false;
    }
    const newUsed = effectiveUsed + slots;
    const rows = [
      { user_id: userId, key: AI_ENRICHMENT_USED_TODAY_KEY, value: newUsed },
      { user_id: userId, key: AI_ENRICHMENT_LAST_RESET_DATE_KEY, value: today },
    ];
    for (const row of rows) {
      const { error } = await client.from("user_settings").upsert(row, { onConflict: "user_id,key" });
      if (error) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function refundEnrichmentSlots(
  client: SupabaseClient<Database>,
  userId: string,
  slots: number,
): Promise<void> {
  if (slots <= 0) {
    return;
  }
  const today = enrichmentUtcDayKey();
  const { storedUsed, lastReset } = await readUsageRows(client, userId);
  if (lastReset.trim() !== today) {
    return;
  }
  const newUsed = Math.max(0, storedUsed - slots);
  const { error } = await client
    .from("user_settings")
    .upsert({ user_id: userId, key: AI_ENRICHMENT_USED_TODAY_KEY, value: newUsed }, { onConflict: "user_id,key" });
  if (error) {
    throw handleSupabaseError(error, "refundEnrichmentSlots");
  }
}
