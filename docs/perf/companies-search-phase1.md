# Companies search — Phase 1 quick wins

**Last updated:** May 20, 2026

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
two-phase fetch, all gated by env flags. Existing behaviour is byte-for-byte
unchanged when every flag is `false` (the default outside `NODE_ENV=development`).

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

Explicit column sort (`sortExplicit: true`) still uses the original
single-phase fetch because the in-memory sort needs the whole survivor set.

### 4. Lexical fast path (`companies-list-supabase.ts`)

`buildCompaniesFilterApplier` returns the new strategy
`keyword_short_query_fastpath` whenever the normalised query length is below
`PHASE1_DEFAULTS.lexicalFastpathMinQueryLength` (**3**). This path runs the
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

## Feature flags

All flags follow the same resolution rule:

- Env explicitly set to `"true"` / `"1"` → **ON**
- Env explicitly set to `"false"` / `"0"` → **OFF**
- Unset:
  - `NODE_ENV === "development"` → **ON** (default-on locally)
  - otherwise → **OFF** (production + Vitest tests are opt-in)

| Env var | Effect when ON |
| --- | --- |
| `COMPANIES_P1_EMBED_CACHE_ENABLED` | Query-embedding TTL cache |
| `COMPANIES_P1_TWO_PHASE_HYBRID_ENABLED` | Two-phase fetch for default RRF order |
| `COMPANIES_P1_RANKED_IDS_CACHE_ENABLED` | Shared ranked-IDs cache between search + nav-ids |
| `COMPANIES_P1_LEXICAL_FASTPATH_ENABLED` | Skip embedding + RPC for `< 3` char queries |
| `COMPANIES_P1_PERF_LOGS_ENABLED` | Emit `[companies-p1] …` timing logs |

Helpers + pinned defaults live in
[`src/lib/companies/phase1-flags.ts`](../../src/lib/companies/phase1-flags.ts).

### Rollback

Set the offending flag to `false` (or remove the env var in production) and
redeploy. No code revert is required — the pre-Phase-1 paths remain intact in
the same files.

---

## Cache invalidation rules

Kept intentionally simple for Phase 1:

- **Embedding cache** — TTL expiry only. The embedding only depends on the
  query string + semantic settings, so row mutations cannot invalidate it.
- **Ranked-IDs cache** — TTL expiry only. Bounded staleness (90 s) is the
  trade-off for cheaper nav and repeated searches. Forced refresh requires a
  TTL wait or process restart. A future safety hook to clear the cache on
  company create/update/delete is noted in the plan but **out of scope** for
  Phase 1.

`clearQueryEmbeddingCacheForTests()` and
`clearHybridRankedIdsCacheForTests()` are exported for test cleanup and ad-hoc
ops scripts.

---

## Observability

Set `COMPANIES_P1_PERF_LOGS_ENABLED=true` to surface structured one-liner logs
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
| `hybrid.singlePhase.done` | `companies-search.ts` | fallback (sortExplicit / two-phase off) |
| `nonHybrid.done` | `companies-search.ts` | `rows`, `totalCount`, `durationMs` |
| `nav-ids.done` | `nav-ids/route.ts` | `idsCount`, `durationMs`, `globalFilterLength` |

These logs are intentionally low-noise; they fire once per request and are
gated by the flag, so production stays quiet unless you flip the switch.

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

Phase 1 flags default to **ON** in `NODE_ENV=development` so contributors get
the optimised paths without extra setup. To force the legacy path locally for
A/B comparison:

```bash
COMPANIES_P1_EMBED_CACHE_ENABLED=false \
COMPANIES_P1_TWO_PHASE_HYBRID_ENABLED=false \
COMPANIES_P1_RANKED_IDS_CACHE_ENABLED=false \
COMPANIES_P1_LEXICAL_FASTPATH_ENABLED=false \
pnpm dev
```

For server-side perf logging during a session, add
`COMPANIES_P1_PERF_LOGS_ENABLED=true` to the same command.

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
