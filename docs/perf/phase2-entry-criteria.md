# Phase 2 entry criteria — checklist & runbook

> Companion to [`companies-search-phase1.md`](companies-search-phase1.md). Phase 2 code lands behind two umbrella flags (`COMPANIES_P2_READS_ENABLED`, `COMPANIES_P2_WRITES_ENABLED`) that default **off** in production. Flip them on **only** after this checklist is fully green for at least **7 consecutive calendar days**.

## Checklist

| # | Criterion | How to verify | Pass condition |
|---|---|---|---|
| 1 | Phase 1 flags enabled in production | `vercel env ls production \| grep COMPANIES_P1_` | All five `COMPANIES_P1_*` keys present and set to `true` for at least 7 days |
| 2 | Embedding cache hit rate | Vercel Logs → filter `[companies-p1] embed.cache.hit` vs `embed.provider.ok` for the last 7 days | Ratio `>= 0.35` |
| 3 | Ranked-IDs cache hit rate | Vercel Logs → filter `[companies-p1] ranked-ids.cache.hit` against nav-ids requests within 90 s of a list search | Ratio `>= 0.50` |
| 4 | `/api/companies/search` p95 latency | Vercel Speed Insights → Pages tab → `/api/companies/search` | `>= 30%` reduction vs [`baseline-2026-05-01.md`](baseline-2026-05-01.md) for semantic-enabled cohort |
| 5 | `/api/companies/nav-ids` p95 latency | Vercel Speed Insights → Pages tab → `/api/companies/nav-ids` | `>= 40%` reduction vs baseline for warm-cache nav |
| 6 | Error budget | Sentry / Vercel function logs for the last 7 days | No new error class introduced by Phase 1 flags; function error rate within baseline tolerance |
| 7 | Sales/marketing sign-off | One week of live usage by the sales team | No perceived regressions reported |

## When a criterion fails

1. **Do not start Phase 2 work.** Phase 2 items assume the Phase 1 caching layer is the steady-state baseline. Items like the Hybrid RPC v2 decision (§4.7 of the plan) depend on Phase 1 measurement data.
2. Investigate using:
   - `[companies-p1]` structured logs in Vercel Logs.
   - `Server-Timing` headers (already emitted by `/api/companies/search` and `/api/companies/nav-ids` after Phase 2 §4.6 ships; for Phase 1, use the structured logs).
   - The Phase 1 baseline anchor in [`baseline-2026-05-01.md`](baseline-2026-05-01.md).
3. Remediate, redeploy, then restart the 7-day observation window.

## Flag flip sequence (once green)

Phase 2 flags flip independently after each PR stream lands and passes Vitest + Playwright + a manual staging smoke pass:

1. **Reads stream** (stats RPC, query-key factories, Server-Timing): set `COMPANIES_P2_READS_ENABLED=true` in Vercel production env.
2. **Writes stream** (generation token, `after()`, CRMForm): set `COMPANIES_P2_WRITES_ENABLED=true` once the reads stream has run cleanly for at least 24 h.
3. Confirm in Vercel Speed Insights that the per-route p95 trend for `/api/companies/search` and `/api/companies/nav-ids` has not regressed.
4. Each flag becomes the default-on baseline only after **7 days of clean Speed Insights** and zero new error-budget burn.

## Rollback

Flipping any `COMPANIES_P2_*` flag back to `false` restores Phase 1 behaviour without a code revert. Both code paths remain intact for at least one release window.

---

**Related docs**

- [`companies-search-phase1.md`](companies-search-phase1.md) — Phase 1 reference.
- [`baseline-2026-05-01.md`](baseline-2026-05-01.md) — pre-Phase-1 latency anchor.
- [`hot-paths-explain.md`](hot-paths-explain.md) — Postgres `EXPLAIN` templates.
