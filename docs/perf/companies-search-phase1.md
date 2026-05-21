# Companies search — Phase 1 quick wins

**Last updated:** May 21, 2026

This doc explains the application-layer performance work that ships in Phase 1
of the companies list/search optimization plan. The DB index baseline
(`firmenname` btree + trgm, `deleted_at`, `status`, `kundentyp`, `firmentyp`,
`land`, `wasserdistanz`, `search_vector` GIN, `search_embedding` HNSW) is
assumed already in place; this phase does not add migrations.

The full plan lives at
[`.cursor/plans/crm_performance_optimization_d6de3251.plan.md`](../../.cursor/plans/crm_performance_optimization_d6de3251.plan.md).

---

## What changed

Phase 1 wraps the existing hybrid + lexical pipeline with three caches and a
two-phase fetch. These behaviours are always on in application code (feature
flags removed May 2026).

### 1. Server-side embedding cache (`semantic-search.ts`)

- Module-level [`TtlCache`](../../src/lib/cache/ttl-cache.ts) keyed by
  normalised query + semantic settings fingerprint
  (`provider | model | strictness | enabled`).
- Hit → returns the cached embedding without touching the provider.
- Miss → calls the provider as before and stores the result.
- Pinned defaults: TTL **7 minutes**, max **400** entries.
- Cleared in tests via `clearQueryEmbeddingCacheForTests()`.

### 2. Shared ranked-IDs cache (`companies-list-supabase.ts`)

- Module-level `TtlCache` shared between
  [`/api/companies/search`](../../src/app/api/companies/search/route.ts) and
  [`/api/companies/nav-ids`](../../src/app/api/companies/nav-ids/route.ts).
- Cache key: stable `JSON.stringify` of normalised `globalFilter`, sorted facet
  groups (`status`, `kategorie`, `betriebstyp`, `land`, `wassertyp`),
  `waterFilter`, and the semantic settings fingerprint.
- Pinned defaults: TTL **90 seconds**, max **400** entries.
- On hit, the applier is rebuilt locally and `rankedIds` is reused — no
  embedding generation, no hybrid RPC, no lexical merge query.
- Cleared in tests via `clearHybridRankedIdsCacheForTests()`.

### 3. Two-phase hybrid fetch (`companies-search.ts`)

For the **default RRF order** (no explicit user column sort) the request now
does:

- **Phase A** — `select('id')` with facet filters + `IN(rankedIds)`, capped at
  `rankedIds.length`. Cheap payload; lets us compute `totalCount` and the
  ordered survivor list.
- **Phase B** — `select('*, contacts(...)') .in('id', pageIds)` for the
  current page slice only (default page size 20).

Explicit column sort (`sortExplicit: true`) fetches the full hybrid survivor
set once, sorts in memory, then paginates (Server-Timing metric: `explicit_sort`).

### 4. Lexical fast path (`companies-list-supabase.ts`)

`buildCompaniesFilterApplier` returns the new strategy
`keyword_short_query_fastpath` whenever the normalised query length is below
`COMPANIES_SEARCH_DEFAULTS.lexicalFastpathMinQueryLength` (**3**). This path runs the
existing `ilike` OR against the indexed columns without ever calling the
embedding provider or `hybrid_company_search`.

### 5. Parallel hybrid + lexical merge

`hybridCompanySearch` and `fetchLexicalCompanyIdsForMerge` are independent
network calls and now run inside `Promise.all`. No behaviour change; one fewer
round-trip on the critical path.

### 6. CompanyDetailClient cleanup

The mount-time `invalidateQueries(["contacts", id])` and `["reminders", id]`
in [`CompanyDetailClient.tsx`](../../src/components/features/companies/CompanyDetailClient.tsx)
was forcing a refetch on every prev/next nav, defeating the 60 s `staleTime`
of the underlying cards. It is removed in Phase 1 — the individual cards
already invalidate after their own mutations.

---

## Configuration (post flag cleanup)

Phase 1 behaviours (caches, two-phase fetch, lexical fastpath) are **always on**.
Tuning defaults live in
[`src/lib/companies/companies-hot-path.ts`](../../src/lib/companies/companies-hot-path.ts)
as `COMPANIES_SEARCH_DEFAULTS`.

Optional structured logs: set `COMPANIES_PERF_LOGS_ENABLED=true` (on by default
in `NODE_ENV=development`).

---

## Cache invalidation rules

- **Embedding cache** — TTL expiry only (7 min). Keys include query text +
  semantic settings; row mutations do not invalidate embeddings.
- **Ranked-IDs cache** — TTL (90 s) plus a per-process **generation token**
  (`bumpCompaniesGeneration()` on writes in [`companies-hot-path.ts`](../../src/lib/companies/companies-hot-path.ts)).
  Same-instance writes invalidate immediately; cross-instance staleness is
  bounded by the TTL (documented serverless limitation).

`clearQueryEmbeddingCacheForTests()` and
`clearHybridRankedIdsCacheForTests()` are exported for test cleanup and ad-hoc
ops scripts.

---

## Observability

Set `COMPANIES_PERF_LOGS_ENABLED=true` to surface structured one-liner logs
prefixed with `[companies-p1]`. Tags emitted in this phase:

| Tag | Where | Payload highlights |
| --- | --- | --- |
| `embed.cache.hit` | `semantic-search.ts` | `ttlMs`, cache `stats` |
| `embed.provider.ok` | `semantic-search.ts` | `provider`, `model`, `durationMs` |
| `embed.provider.error` | `semantic-search.ts` | `provider`, `model`, `durationMs` |
| `hybrid.rpc.ok` | `semantic-search.ts` | `durationMs`, `rows`, `matchCount` |
| `hybrid.rpc.error` | `semantic-search.ts` | `durationMs` |
| `filter.fastpath.short_query` | `companies-list-supabase.ts` | `length`, `threshold` |
| `ranked-ids.cache.hit` | `companies-list-supabase.ts` | `size`, cache `stats` |
| `ranked-ids.computed` | `companies-list-supabase.ts` | `hybridCount`, `lexicalCount`, `mergedCount`, `durationMs` |
| `hybrid.twoPhase.phaseA` | `companies-search.ts` | `rankedIdsCount`, `survivorCount`, `totalCount`, `pageIdsCount`, `durationMs` |
| `hybrid.twoPhase.phaseB` | `companies-search.ts` | `pageRows`, `durationMs`, `totalDurationMs`, `strategy` |
| `hybrid.explicitSort.done` | `companies-search.ts` | explicit column sort over hybrid survivors |
| `nonHybrid.done` | `companies-search.ts` | `rows`, `totalCount`, `durationMs` |
| `nav-ids.done` | `nav-ids/route.ts` | `idsCount`, `durationMs`, `globalFilterLength` |

These logs are intentionally low-noise; they fire once per request and are
gated by `COMPANIES_PERF_LOGS_ENABLED`, so production stays quiet unless you flip the switch.

---

## Success metrics

| KPI | Target |
| --- | --- |
| `/api/companies/search` p95 (semantic-enabled) | **−30 %** vs baseline |
| `/api/companies/nav-ids` p95 (warm cache) | **−40 %** vs baseline |
| List page hybrid response payload | **−50 %** in bytes (page-only fetch) |
| Embedding cache hit rate within 7 min | **≥ 35 %** |
| Ranked-IDs cache hit rate within 90 s of list search | **≥ 50 %** |
| Cache size per cache | **≤ 400** entries |

Measure with Vercel Speed Insights for the route p95 numbers and with the
`[companies-p1]` log tags above for cache hit ratios + payload sizes. Anchor
against [`baseline-2026-05-01.md`](baseline-2026-05-01.md) before re-recording
after each deploy.

---

## Local development

Optimised paths are always active. For server-side perf logging during a session:

```bash
COMPANIES_PERF_LOGS_ENABLED=true pnpm dev
```

---

## Out of scope (tracked for Phase 2+)

- Pushing facet filters into `hybrid_company_search` so the RPC returns a
  pre-filtered page set directly.
- Replacing the `["companies"]` / `["contacts"]` full-table client fetches in
  `CompanyDetailClient`, `TimelineCard`, and similar consumers with scoped
  hooks.
- Moving heavy enrichment/geocode/backfill side effects into queued workers.
- Promoting these in-memory caches to a shared store (Redis / Vercel KV) once
  multi-region or multi-worker behaviour matters more than process simplicity.
