# Phase 2 entry criteria — archived rollout checklist

> **Status (May 2026):** All Phase 1 and Phase 2 optimisations are **always on** in application code. Feature flags (`COMPANIES_P1_*`, `COMPANIES_P2_*`) were removed; delete any leftover keys from Vercel. The only optional env var left is `COMPANIES_PERF_LOGS_ENABLED` (structured console logs).

> This document is **archived** — it records the gates used before rollout, not current operation.

## Historical checklist (pre-rollout)

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

## Historical flag flip sequence (obsolete)

During rollout, reads and writes shipped behind separate env flags. That mechanism was removed in May 2026.

## Rollback today

Use `git revert` on the offending deploy. Env-flag rollback no longer applies.

---

**Related docs**

- [`companies-search-phase1.md`](companies-search-phase1.md) — Phase 1 reference.
- [`baseline-2026-05-01.md`](baseline-2026-05-01.md) — pre-Phase-1 latency anchor.
- [`hot-paths-explain.md`](hot-paths-explain.md) — Postgres `EXPLAIN` templates.
