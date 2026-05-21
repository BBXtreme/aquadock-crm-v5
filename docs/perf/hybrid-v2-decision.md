# Hybrid RPC v2 — decision criteria & implementation outline

> Phase 2 §4.7 conditional item. Companion to [`phase2-entry-criteria.md`](phase2-entry-criteria.md). This document is a **decision gate**, not an implementation plan. The work below is **deferred** until production data justifies it. Re-evaluate weekly after Phase 2 ships.

## Background

Phase 1 added the two-phase hybrid fetch: a cheap `id`-only survivor query (Phase A) followed by a small row+contacts query for the current page (Phase B). The Phase A query has to intersect with all active facets every time, even though `hybrid_company_search` already returns up to 1000 globally relevant rows.

Hybrid RPC v2 pushes facet filters **into the RPC** itself. The function returns IDs that already satisfy `status`, `kundentyp`, `firmentyp`, `land`, `wassertyp`, `water` predicates, eliminating Phase A entirely.

## Decision criteria

Ship Hybrid RPC v2 only if **all** of the following are observed in Phase 2A production data for at least **7 consecutive days**.

| Trigger | Source | Threshold |
|---|---|---|
| `phase_a` Server-Timing p95 | Vercel Speed Insights → `/api/companies/search` → sub-metrics | `>= 80 ms` |
| Share of searches with `>= 2` active facets | `companies.search` custom event → `facetCount >= 2` cohort | `>= 15%` of total semantic-enabled searches |
| Survivor count when 2+ facets active | `companies.search` custom event → `resultCount` joined with `facetCount >= 2` cohort | `< 60%` of facet-only count (tight facets are starving hybrid relevance) |

If **any** trigger fails, the existing two-phase fetch is good enough and the RPC v2 effort moves to Phase 3.

## How to measure (weekly cadence)

1. Open Vercel Speed Insights → Pages → `/api/companies/search`.
2. Sub-metrics tab → record p95 of `phase_a` for the last 7 days.
3. Custom Events tab → `companies.search` → split by `facetCount`:
   - Sum the share where `facetCount >= 2` → divide by total event count.
   - For the same cohort, record p50 of `resultCount`.
4. Compare against the thresholds above. Record the snapshot in the team perf channel.

If no triggers fire after 30 days of warm production data, **close** the v2 question and move the work officially to Phase 3.

## Implementation outline (if/when triggered)

Promote this section to a real PR plan **only** after the decision gate fires.

### Migration sketch

```sql
-- Side-by-side with v1; keep v1 callable for one release window.
CREATE OR REPLACE FUNCTION public.hybrid_company_search_v2(
  p_query text,
  p_query_embedding vector(1536),
  p_match_count integer DEFAULT 200,
  p_rrf_k integer DEFAULT 60,
  p_fts_weight double precision DEFAULT 1.0,
  p_vector_weight double precision DEFAULT 1.0,
  p_max_vector_distance double precision DEFAULT 0.5,
  -- Phase 2 §4.7: optional facet pushdown.
  p_status text[] DEFAULT NULL,
  p_kundentyp text[] DEFAULT NULL,
  p_firmentyp text[] DEFAULT NULL,
  p_land text[] DEFAULT NULL,
  p_wassertyp text[] DEFAULT NULL,
  p_water_band text DEFAULT NULL
)
RETURNS TABLE (
  company_id uuid,
  rrf_score double precision,
  fts_rank integer,
  vector_rank integer
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  -- Same FTS + vector CTE structure as v1, with the facet predicates joined
  -- into each CTE before the LIMIT. See src/sql/semantic-company-search.sql
  -- for the v1 reference.
$$;
```

### App-side wiring

1. Add a dedicated `COMPANIES_HYBRID_V2_ENABLED` env flag if independent rollback is needed (Phase 1/2 umbrella flags were removed in May 2026).
2. In `src/lib/services/semantic-search.ts`, branch `hybridCompanySearch` to call either `hybrid_company_search` (v1) or `hybrid_company_search_v2` (v2) depending on the flag. Pass facet arrays through from `buildCompaniesFilterApplier`.
3. In `src/lib/server/companies-search.ts`, when v2 is on, **skip Phase A** entirely — `rankedIds` from v2 already satisfies the facets. Phase B continues unchanged.
4. Keep v1 callable for one release window. After 7 days of clean Speed Insights on v2, drop the v1 branch.

### Verification

- New Vitest covering the facet-array shape passed to the RPC.
- Existing tests must continue to pass (v2 is additive).
- `EXPLAIN (ANALYZE, BUFFERS)` against `hybrid_company_search_v2` on staging to confirm the facet predicates land before the FTS/vector LIMITs.
- 24 h of production warm-up before flipping the flag default-on.

## Rollback

If v2 regresses (e.g. relevance worsens because tight facets eliminate too many vector candidates), flip the flag back. Both RPCs remain installed in the database until the next migration cleanup.

---

**Related docs**

- [`phase2-entry-criteria.md`](phase2-entry-criteria.md) — gates that must pass before Phase 2 starts.
- [`server-timing-readme.md`](server-timing-readme.md) — how to read the `phase_a` p95 that drives this decision.
- [`hot-paths-explain.md`](hot-paths-explain.md) — Postgres `EXPLAIN` templates.
