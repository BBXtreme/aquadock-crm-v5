// Phase 2 §4.6 — minimal `Server-Timing` helper.
//
// Free, always-on, DevTools-visible perf trace that Vercel Speed Insights also
// consumes automatically. Used by `/api/companies/search` and
// `/api/companies/nav-ids` to surface the 9 named metrics defined in the plan
// (`auth`, `embed_cache_hit`, `embed_provider`, `hybrid_rpc`, `lexical_merge`,
// `ranked_ids_cache_hit`, `phase_a`, `phase_b`, `total`).
//
// Design notes:
//   - `Map`-backed dedupe by metric name → last-wins for repeated entries.
//     Prevents confusing duplicate rows in DevTools when a code path
//     accidentally re-enters a phase.
//   - Tiny surface: `start()` returns a stop callback; `mark()` records an
//     instant; `header()` serialises. No framework layering.
//   - Metric names are intentionally short and whitelisted in the plan — do
//     NOT add user-supplied strings to the metric name or `desc` field, which
//     would risk leaking internals through response headers.

import { isPhase2ReadsEnabled } from "@/lib/companies/phase-cache-control";

type Mark = { dur: number; desc?: string };

/**
 * Allowed named metrics for the /companies hot paths. New entries must be
 * added explicitly here so we never put user input into a response header.
 */
export type CompaniesServerTimingMetric =
  | "auth"
  | "embed_cache_hit"
  | "embed_provider"
  | "hybrid_rpc"
  | "lexical_merge"
  | "ranked_ids_cache_hit"
  | "phase_a"
  | "phase_b"
  | "single_phase"
  | "non_hybrid"
  | "nav_ids"
  | "total";

export class ServerTiming {
  // Map = automatic dedupe by metric name; last-wins for repeated entries.
  private readonly marks = new Map<string, Mark>();

  /**
   * Begin timing a phase. Returns a stop callback that records the elapsed
   * milliseconds under `name`. Re-entering the same `name` overwrites the
   * previous mark (last-wins) so DevTools always shows a single, well-defined
   * entry per metric.
   */
  start(name: CompaniesServerTimingMetric, desc?: string): () => void {
    const t0 = performance.now();
    return () => {
      this.marks.set(name, { dur: performance.now() - t0, desc });
    };
  }

  /** Record an instantaneous marker (default duration 0). */
  mark(name: CompaniesServerTimingMetric, dur = 0, desc?: string): void {
    this.marks.set(name, { dur, desc });
  }

  /** Serialise the accumulated marks into a `Server-Timing` header value. */
  header(): string {
    return Array.from(this.marks, ([name, m]) =>
      `${name};dur=${m.dur.toFixed(1)}${m.desc ? `;desc="${m.desc}"` : ""}`,
    ).join(", ");
  }

  /** Diagnostics: get the recorded marks as a plain object (for logs/tests). */
  snapshot(): Record<string, Mark> {
    return Object.fromEntries(this.marks);
  }

  /** True when the consumer should attach headers to the response. */
  static isEnabled(): boolean {
    return isPhase2ReadsEnabled();
  }
}

/**
 * Convenience builder that returns a no-op `ServerTiming` when the Phase 2
 * reads flag is off. Lets call sites stay unconditional:
 *
 *   const timing = createServerTiming();
 *   const stop = timing.start("hybrid_rpc");
 *   await hybridCompanySearch(...);
 *   stop();
 *   return NextResponse.json(result, { headers: serverTimingHeaders(timing) });
 */
export function createServerTiming(): ServerTiming {
  return new ServerTiming();
}

/**
 * Returns a `headers` object suitable for `NextResponse.json(..., { headers })`.
 * Returns `undefined` when the flag is off so the consumer can keep its
 * happy-path response untouched.
 */
export function serverTimingHeaders(
  timing: ServerTiming,
): Record<string, string> | undefined {
  if (!ServerTiming.isEnabled()) {
    return undefined;
  }
  const value = timing.header();
  if (value.length === 0) {
    return undefined;
  }
  return { "Server-Timing": value };
}
