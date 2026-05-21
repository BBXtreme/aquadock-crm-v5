# Server-Timing readme — how to read the perf headers

> Companion to [`companies-search-phase1.md`](companies-search-phase1.md) and [`phase2-entry-criteria.md`](phase2-entry-criteria.md). The team should be able to read both **DevTools** (per-request) and **Vercel Speed Insights** (aggregate p95) without re-deriving the metric names every time.

## What gets emitted

After Phase 2 §4.6 lands, every response from these two routes carries a `Server-Timing` header (gated by `COMPANIES_P2_READS_ENABLED`):

- `POST /api/companies/search`
- `POST /api/companies/nav-ids`

The helper lives in [`src/lib/server/server-timing.ts`](../../src/lib/server/server-timing.ts) and is `Map`-backed (last-wins dedupe — duplicate metric names never produce confusing duplicate rows in DevTools).

## Named metrics

| Metric | Description | Emitted when |
|---|---|---|
| `auth` | `supabase.auth.getUser()` round-trip | always |
| `embed_cache_hit` | duration `0` marker | query embedding served from in-process TTL cache |
| `embed_provider` | embedding provider call duration | embedding cache miss (gateway / OpenAI / xAI) |
| `hybrid_rpc` | `hybrid_company_search` RPC duration | hybrid strategy |
| `lexical_merge` | lexical merge query duration | hybrid strategy |
| `ranked_ids_cache_hit` | duration `0` marker | ranked-IDs cache served the result |
| `phase_a` | id-only survivor fetch | two-phase hybrid enabled (default RRF order) |
| `phase_b` | page-row fetch | two-phase hybrid enabled |
| `single_phase` | legacy single-phase fetch | sortExplicit or two-phase flag off |
| `non_hybrid` | non-hybrid list query | `globalFilter` empty / semantic disabled / short-query fastpath |
| `nav_ids` | nav-ids only — `fetchAllCompanyIdsForListNavigation` | always on `/api/companies/nav-ids` |
| `total` | total handler duration | always |

Capped at 9 metrics per response on `/api/companies/search` to keep header size safe.

## Reading the header in Chrome DevTools (30 seconds)

1. Open the `/companies` page in dev (`pnpm dev`).
2. DevTools → **Network**.
3. Click a `search` or `nav-ids` request.
4. **Timing** tab → scroll to **Server Timing**.

You will see rows like:

```
auth          12.4 ms
embed_cache_hit  0.0 ms
hybrid_rpc    88.4 ms
lexical_merge 34.1 ms
phase_a       22.7 ms
phase_b       72.6 ms
total        265.8 ms
```

If `embed_cache_hit` and `ranked_ids_cache_hit` BOTH appear with `0.0 ms`, the request was fully warm.

## Reading the header in Vercel Speed Insights

1. Vercel dashboard → project → **Speed Insights**.
2. **Pages** tab → filter by route (`/api/companies/search` or `/api/companies/nav-ids`).
3. The named metrics appear as **sub-metrics** of the request and are aggregated as p50 / p75 / p95.

Same names, no extra wiring — Speed Insights consumes the header automatically.

## "Good vs concerning" reference table

Use these thresholds when triaging a slow request or assessing a deploy:

| Metric | Good (p95) | Concerning (p95) | Most likely cause when concerning |
|---|---|---|---|
| `phase_a` | `< 30 ms` | `> 80 ms` | Phase 1 cache health regressed (ranked-IDs cache rate dropped). Check `[companies-p1] ranked-ids.cache.hit` log ratio. |
| `embed_provider` | `< 250 ms` | `> 600 ms` | Gateway or OpenAI provider latency. Check the provider status page; consider switching `EMBEDDING_PROVIDER`. |
| `hybrid_rpc` | `< 120 ms` | `> 350 ms` | Postgres plan regression or row growth on `companies`. Re-run [`hot-paths-explain.md`](hot-paths-explain.md) templates on staging. |
| `auth` | `< 50 ms` | `> 200 ms` | Supabase auth slowness or cold function instance. Watch `total` to see if this is dominating. |
| `total` | `< 250 ms` warm / `< 600 ms` cold | `> 1.5 s` | Compound regression — start by checking which sub-metric grew. |

## Companion events in Speed Insights

The `companies.search` custom event ([`src/lib/server/perf-events.ts`](../../src/lib/server/perf-events.ts)) is posted on every search response with these flat properties:

- `strategy` — `hybrid` | `keyword_fallback` | `keyword_short_query_fastpath` | `keyword_semantic_disabled` | `none`
- `embeddingCacheHit` — boolean
- `rankedIdsCacheHit` — boolean
- `twoPhase` — boolean (true when `phase_a`/`phase_b` ran)
- `facetCount` — `0..5`
- `resultCount` — number of page rows returned

Use these to split p95 by cohort in Speed Insights: e.g. compare `strategy=hybrid` vs `strategy=keyword_short_query_fastpath`, or warm-vs-cold ranked-IDs cache.

## Action items

- If `phase_a` is concerning for 24 h+ → investigate the ranked-IDs cache hit ratio and the generation token wiring.
- If `embed_provider` is concerning → check Vercel AI Gateway status; document any provider switch in `[companies-p1]` logs.
- If `hybrid_rpc` is concerning → run `EXPLAIN (ANALYZE, BUFFERS)` against `public.hybrid_company_search(...)` on staging.
- If two metrics regress together → likely a hot-path code change. Bisect with git.

---

**Related docs**

- [`companies-search-phase1.md`](companies-search-phase1.md) — Phase 1 caching surface that these metrics observe.
- [`phase2-entry-criteria.md`](phase2-entry-criteria.md) — gates that must be green before flipping flags.
- [`hot-paths-explain.md`](hot-paths-explain.md) — Postgres `EXPLAIN` templates.
- [`baseline-2026-05-01.md`](baseline-2026-05-01.md) — pre-Phase-1 latency anchor.
