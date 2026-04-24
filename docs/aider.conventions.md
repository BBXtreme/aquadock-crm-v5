# Conventions (short) — AquaDock CRM v5

**Companion to** [`AIDER-RULES.md`](AIDER-RULES.md) — read that file for the full quality gate.  
**Last updated:** April 24, 2026  

| Topic | Rule |
| --- | --- |
| **TS** | No `!`, no `as any` |
| **Lint / format** | Biome only (`pnpm check:fix`) |
| **Forms / API bodies** | Zod in `src/lib/validations/`, `.strict()` at boundaries |
| **Mutations** | Prefer Server Actions; Route Handlers only for HTTP/JSON contract needs |
| **Data** | Server Supabase client + RLS; service role never in the browser |
| **UI** | `Control<T>` with RHF; match existing shadcn/tailwind patterns |
| **i18n** | `src/messages/*`; `pnpm messages:validate` after key edits |
| **PR** | `typecheck` + `check:fix` + tests when logic/UI changes |
| **Tests** | [`testing-strategy.md`](testing-strategy.md) — Vitest vs Playwright |

**Branch names:** `feature/…`, `fix/…`, `chore/…` (as in `README.md`).
