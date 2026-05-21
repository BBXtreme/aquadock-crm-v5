// Centralised feature flags + cache-control primitives for the Phase 1 quick
// wins AND the Phase 2 work on the /companies list + search + nav-ids hot
// path.
//
// Renamed from `phase1-flags.ts` in Phase 2 because the file now also owns:
//   - Phase 2 umbrella flags (`COMPANIES_P2_READS_ENABLED` / `COMPANIES_P2_WRITES_ENABLED`).
//   - The per-process `companiesGeneration` counter used for deterministic
//     ranked-IDs cache invalidation on writes (see §4.2 of the Phase 2 plan).
//
// Flag resolution rules (unchanged from Phase 1):
//   - Env var explicitly set to "true" / "1"  → ON
//   - Env var explicitly set to "false" / "0" → OFF
//   - Unset:
//       NODE_ENV === "development" → ON  (default-on locally)
//       otherwise                  → OFF (opt-in elsewhere, e.g. production, test)
//
// Test environments (Vitest sets NODE_ENV=test) fall through to OFF so the
// existing test suite keeps the pre-Phase behaviour unless a test explicitly
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

/**
 * Reads a flag that needs to be visible in both server and client bundles.
 *
 * Vercel / Next.js only exposes `NEXT_PUBLIC_*` env vars to the browser. For
 * Phase 2 reads (e.g. the client-side `companies_stats()` RPC call) we accept
 * EITHER `NEXT_PUBLIC_<NAME>` (client+server) OR the bare `<NAME>`
 * (server-only). The bare form lets us keep server-only logs and routes off
 * the public bundle when desired.
 */
function readClientSafeBooleanFlag(name: string, defaultInDev: boolean): boolean {
  const publicValue = process.env[`NEXT_PUBLIC_${name}`];
  if (typeof publicValue === "string") {
    const v = publicValue.trim().toLowerCase();
    if (TRUE_VALUES.has(v)) return true;
    if (FALSE_VALUES.has(v)) return false;
  }
  return readBooleanFlag(name, defaultInDev);
}

// ---------------------------------------------------------------------------
// Phase 1 flags (unchanged surface; preserved for backwards compatibility).
// ---------------------------------------------------------------------------

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

/** Pinned Phase 1 tuning defaults — see the Phase 1 plan in `.cursor/plans/`. */
export const PHASE1_DEFAULTS = {
  embedCacheTtlMs: 7 * 60 * 1000,
  embedCacheMaxEntries: 400,
  rankedIdsCacheTtlMs: 90 * 1000,
  rankedIdsCacheMaxEntries: 400,
  /** Normalised query lengths below this skip embedding + hybrid RPC. */
  lexicalFastpathMinQueryLength: 3,
} as const;

// ---------------------------------------------------------------------------
// Phase 2 umbrella flags.
// ---------------------------------------------------------------------------

/**
 * Phase 2 reads umbrella flag. Controls:
 *   - `companies_stats()` RPC client call vs legacy full-table scan.
 *   - Query-key factory migration call-sites that ship behind the flag.
 *   - `Server-Timing` header emission on /api/companies/search and nav-ids.
 *
 * Client-visible via the `NEXT_PUBLIC_COMPANIES_P2_READS_ENABLED` companion
 * so the browser bundle can short-circuit to the new RPC call.
 */
export function isPhase2ReadsEnabled(): boolean {
  return readClientSafeBooleanFlag("COMPANIES_P2_READS_ENABLED", true);
}

/**
 * Phase 2 writes umbrella flag. Controls:
 *   - Generation-token bumps from create/update/delete server actions.
 *   - `after()` deferral of ownership audit + new-owner notification.
 *   - `CRMForm` server-action standardisation.
 *
 * Server-only by design: writes never need a client bundle hint.
 */
export function isPhase2WritesEnabled(): boolean {
  return readBooleanFlag("COMPANIES_P2_WRITES_ENABLED", true);
}

// ---------------------------------------------------------------------------
// Generation token (Phase 2 §4.2).
// ---------------------------------------------------------------------------

/**
 * Per-process integer counter consulted by the ranked-IDs cache to invalidate
 * stale entries after company mutations. The cache stores the generation at
 * write-time and treats `entry.generation < currentCompaniesGeneration()` as
 * a cache miss.
 *
 * Critical limitation — be explicit in code and docs:
 *   In Vercel's serverless environment each function instance has its own
 *   counter AND its own TtlCache, so a bump in instance A is INVISIBLE to
 *   instance B. The token's benefit is real but bounded to "same instance
 *   immediately after a write".
 *
 *   The 90 s TTL on the ranked-IDs cache remains the true cross-instance
 *   safety net. Promoting to a shared KV (which would give true cross-
 *   instance invalidation) is deferred to Phase 3 and is the right move
 *   only if monitoring proves cross-instance staleness causes user-visible
 *   problems. Cross-instance staleness is monitored during Phase 2 and
 *   persistent user-visible issues are the trigger to evaluate the KV.
 *
 *   The token is NOT applied to the embedding cache — embeddings depend on
 *   the query string + semantic settings, not on row data.
 */
let companiesGeneration = 0;

/** Bump from any server-side company write path. Best-effort, never throws. */
export function bumpCompaniesGeneration(): void {
  if (!isPhase2WritesEnabled()) {
    return;
  }
  companiesGeneration += 1;
}

/** Read the current per-process generation. Always returns a finite integer. */
export function currentCompaniesGeneration(): number {
  return companiesGeneration;
}

/** Exposed for tests + ops; resets the per-process generation counter. */
export function resetCompaniesGenerationForTests(): void {
  companiesGeneration = 0;
}

// ---------------------------------------------------------------------------
// Structured perf log helper (used by Phase 1 + Phase 2).
// ---------------------------------------------------------------------------

/**
 * Phase-tagged structured perf log writer. Emits one line per call to
 * `console.info` prefixed with `[companies-<phase>] <label>`, gated by
 * `COMPANIES_P1_PERF_LOGS_ENABLED`. One log line per request, no per-event
 * noise — the `Server-Timing` header is the per-request signal.
 */
export type CompaniesPerfPhase = "p1" | "p2";

export function logCompaniesPerf(
  phase: CompaniesPerfPhase,
  label: string,
  payload: Record<string, unknown>,
): void {
  if (!isPerfLogsEnabled()) {
    return;
  }
  // eslint-disable-next-line no-console -- intentional dev/ops instrumentation
  console.info(`[companies-${phase}] ${label}`, payload);
}

/**
 * Backwards-compatible Phase 1 helper. Equivalent to
 * `logCompaniesPerf("p1", label, payload)`; preserved so existing Phase 1
 * call sites keep working unchanged.
 */
export function logPhase1Perf(label: string, payload: Record<string, unknown>): void {
  logCompaniesPerf("p1", label, payload);
}
