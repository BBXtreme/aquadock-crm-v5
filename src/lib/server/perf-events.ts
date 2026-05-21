// Phase 2 §4.6 — typed Vercel Speed Insights / Analytics event helpers for the
// /companies search hot path.
//
// Why a typed wrapper?
//   - Speed Insights cross-joins these events with route p95 trends, so the
//     event shape needs to stay stable. The risk register flags shape drift
//     as a real concern (custom events that diverge over time break cohort
//     analysis).
//   - One module owns the contract; route handlers call helpers that never
//     accept raw strings for the discriminated fields.
//   - Best-effort: failures swallow silently. Posting an event must never
//     change response behaviour.

import "server-only";

import { track } from "@vercel/analytics/server";
import type { CompaniesGlobalSearchStrategy } from "@/lib/companies/companies-list-supabase";
import { isPhase2ReadsEnabled } from "@/lib/companies/phase-cache-control";
import type { CompaniesFilterGroup } from "@/lib/utils/company-filters-url-state";

/**
 * Canonical event name posted from `POST /api/companies/search`. Keep this
 * string stable forever — Speed Insights groups by event name in its UI.
 */
export const COMPANIES_SEARCH_EVENT = "companies.search" as const;

/**
 * Event payload sent to Vercel Analytics. Discriminated by `strategy` so we
 * can split p95 by hybrid vs lexical-fastpath vs fallback vs none cohorts
 * without touching the application code again.
 */
export type CompaniesSearchEventPayload = {
  strategy: CompaniesGlobalSearchStrategy;
  /** True when the embedding TTL cache satisfied the query without a provider call. */
  embeddingCacheHit: boolean;
  /** True when the ranked-IDs TTL cache satisfied the query without recompute. */
  rankedIdsCacheHit: boolean;
  /** True when the two-phase hybrid fetch executed (default RRF order path). */
  twoPhase: boolean;
  /** Count of non-empty active filter groups (0..5). Used by the Hybrid v2 trigger. */
  facetCount: number;
  /** Page-row count returned in the response. */
  resultCount: number;
};

type CompaniesSearchEventInput = {
  strategy: CompaniesGlobalSearchStrategy;
  activeFilters: Record<CompaniesFilterGroup, string[]>;
  waterFilter: string | null;
  resultCount: number;
  /** Output of `ServerTiming.snapshot()` so we can derive cache-hit booleans. */
  timingSnapshot: Record<string, { dur: number; desc?: string }>;
};

function countActiveFacets(input: CompaniesSearchEventInput): number {
  let n = 0;
  for (const group of Object.values(input.activeFilters)) {
    if (Array.isArray(group) && group.length > 0) {
      n += 1;
    }
  }
  if (input.waterFilter != null) {
    n += 1;
  }
  return n;
}

/**
 * Fire-and-forget cohort event for Speed Insights. Idempotent at the call
 * site (one event per `/api/companies/search` response). Returns void; never
 * throws.
 */
export async function trackCompaniesSearchEvent(
  input: CompaniesSearchEventInput,
): Promise<void> {
  if (!isPhase2ReadsEnabled()) {
    return;
  }
  const payload: CompaniesSearchEventPayload = {
    strategy: input.strategy,
    embeddingCacheHit: "embed_cache_hit" in input.timingSnapshot,
    rankedIdsCacheHit: "ranked_ids_cache_hit" in input.timingSnapshot,
    twoPhase: "phase_a" in input.timingSnapshot || "phase_b" in input.timingSnapshot,
    facetCount: countActiveFacets(input),
    resultCount: input.resultCount,
  };
  try {
    // @vercel/analytics `track()` is server-safe and best-effort. The
    // signature accepts only flat string/number/boolean values; our payload
    // is already that shape.
    await track(COMPANIES_SEARCH_EVENT, payload);
  } catch (err) {
    // Never let analytics failures interfere with the user response.
    console.warn("[companies-p2] track(companies.search) failed", err);
  }
}
