// Centralised feature flags + tuning constants for the Phase 1 quick wins on
// the /companies list + search + nav-ids hot path.
//
// Resolution rules:
//   - Env var explicitly set to "true" / "1"  → ON
//   - Env var explicitly set to "false" / "0" → OFF
//   - Unset:
//       NODE_ENV === "development" → ON  (default-on locally)
//       otherwise                  → OFF (opt-in elsewhere, e.g. production, test)
//
// Test environments (Vitest sets NODE_ENV=test) fall through to OFF so the
// existing test suite keeps the pre-Phase-1 behaviour unless a test explicitly
// opts in via process.env.

const TRUE_VALUES = new Set(["true", "1"]);
const FALSE_VALUES = new Set(["false", "0"]);

function readBooleanFlag(name: string, defaultInDev: boolean): boolean {
  const raw = process.env[name];
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (TRUE_VALUES.has(v)) return true;
    if (FALSE_VALUES.has(v)) return false;
  }
  return process.env.NODE_ENV === "development" ? defaultInDev : false;
}

/** Cache server-side query embeddings keyed by query + semantic settings. */
export function isEmbedCacheEnabled(): boolean {
  return readBooleanFlag("COMPANIES_P1_EMBED_CACHE_ENABLED", true);
}

/** Two-phase hybrid fetch: rank IDs first, fetch only current-page rows. */
export function isTwoPhaseHybridEnabled(): boolean {
  return readBooleanFlag("COMPANIES_P1_TWO_PHASE_HYBRID_ENABLED", true);
}

/** Share ranked IDs between /api/companies/search and /api/companies/nav-ids. */
export function isRankedIdsCacheEnabled(): boolean {
  return readBooleanFlag("COMPANIES_P1_RANKED_IDS_CACHE_ENABLED", true);
}

/** Lexical-only fast path for short (< 3 chars) or semantic-disabled queries. */
export function isLexicalFastpathEnabled(): boolean {
  return readBooleanFlag("COMPANIES_P1_LEXICAL_FASTPATH_ENABLED", true);
}

/** Verbose latency / cache-hit logging for hot paths (off by default outside dev). */
export function isPerfLogsEnabled(): boolean {
  return readBooleanFlag("COMPANIES_P1_PERF_LOGS_ENABLED", true);
}

/** Pinned tuning defaults — see .cursor/plans/crm_performance_optimization_d6de3251.plan.md. */
export const PHASE1_DEFAULTS = {
  embedCacheTtlMs: 7 * 60 * 1000,
  embedCacheMaxEntries: 400,
  rankedIdsCacheTtlMs: 90 * 1000,
  rankedIdsCacheMaxEntries: 400,
  /** Normalised query lengths below this skip embedding + hybrid RPC. */
  lexicalFastpathMinQueryLength: 3,
} as const;

/** Lightweight perf log helper. Gated by `COMPANIES_P1_PERF_LOGS_ENABLED`. */
export function logPhase1Perf(label: string, payload: Record<string, unknown>): void {
  if (!isPerfLogsEnabled()) {
    return;
  }
  // eslint-disable-next-line no-console -- intentional dev/ops instrumentation
  console.info(`[companies-p1] ${label}`, payload);
}
