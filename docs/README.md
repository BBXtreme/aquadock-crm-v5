# Documentation index

Start with the [project README](../README.md) for install, stack, and commands. This folder holds deeper references.

| File | Use when you need… |
| --- | --- |
| [testing-strategy.md](testing-strategy.md) | **When to use Vitest vs Playwright**, coverage exclusions, cheat sheet |
| [folder-conventions.md](folder-conventions.md) | **Where to put new code** — `app/` vs `features/`, actions vs services, large list hooks |
| [architecture.md](architecture.md) | How the app is layered, **HTTP API table**, Zod, testing, a11y |
| [standortanalyse.md](standortanalyse.md) | Standortanalyse page flow (internal + public), saved analyses table actions, CRM import options |
| [AIDER-RULES.md](AIDER-RULES.md) | PR quality gate (all contributors) |
| [aider.conventions.md](aider.conventions.md) | One-page convention table |
| [SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md) | Tables, RLS, Storage, Realtime, SQL apply order |
| [production-deploy.md](production-deploy.md) | Go-live: Vercel, Supabase, GitHub Actions + E2E |
| [vercel-production.md](vercel-production.md) | Short Vercel + auth URL checklist |
| [BREVO_SDK.md](BREVO_SDK.md) | Brevo REST client usage |
| [README_OpenMap.md](README_OpenMap.md) | OpenMap, OSM, Overpass |
| [react-table-v8-ts-tricks.md](react-table-v8-ts-tricks.md) | TanStack Table TypeScript patterns |
| [perf/companies-search-phase1.md](perf/companies-search-phase1.md) | Companies list/search hot path (always-on caches, two-phase hybrid, observability) |
| [perf/phase2-entry-criteria.md](perf/phase2-entry-criteria.md) | Historical Phase 2 rollout checklist (archived; flags removed) |
| [perf/server-timing-readme.md](perf/server-timing-readme.md) | How to read `Server-Timing` headers in DevTools + Speed Insights |
| [perf/hybrid-v2-decision.md](perf/hybrid-v2-decision.md) | Decision gate for shipping `hybrid_company_search_v2` (Phase 2 §4.7 conditional) |
| [perf/hot-paths-explain.md](perf/hot-paths-explain.md) | Postgres `EXPLAIN` templates for the heaviest RPCs |
| [perf/baseline-2026-05-01.md](perf/baseline-2026-05-01.md) | Pre-optimisation latency anchor for KPI comparisons |

**Last updated:** May 21, 2026  
