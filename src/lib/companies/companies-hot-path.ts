// Companies list/search hot-path primitives: cache tuning defaults, write
// generation token for ranked-IDs invalidation, and optional structured perf
// logs.

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

/** Pinned tuning for embedding + ranked-IDs TTL caches and lexical fastpath. */
export const COMPANIES_SEARCH_DEFAULTS = {
  embedCacheTtlMs: 7 * 60 * 1000,
  embedCacheMaxEntries: 400,
  rankedIdsCacheTtlMs: 90 * 1000,
  rankedIdsCacheMaxEntries: 400,
  /** Normalised query lengths below this skip embedding + hybrid RPC. */
  lexicalFastpathMinQueryLength: 3,
} as const;

/**
 * Optional structured `[companies-p1|p2]` logs for ops. Off in production/test
 * unless `COMPANIES_PERF_LOGS_ENABLED=true`; on by default in development.
 */
export function isPerfLogsEnabled(): boolean {
  return readBooleanFlag("COMPANIES_PERF_LOGS_ENABLED", true);
}

/**
 * Per-process integer counter consulted by the ranked-IDs cache to invalidate
 * stale entries after company mutations. The cache stores the generation at
 * write-time and treats `entry.generation < currentCompaniesGeneration()` as
 * a cache miss.
 *
 * In Vercel serverless each instance has its own counter; the 90 s TTL is the
 * cross-instance safety net.
 */
let companiesGeneration = 0;

/** Bump from any server-side company write path. Best-effort, never throws. */
export function bumpCompaniesGeneration(): void {
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

/** Equivalent to `logCompaniesPerf("p1", label, payload)`. */
export function logPhase1Perf(label: string, payload: Record<string, unknown>): void {
  logCompaniesPerf("p1", label, payload);
}
