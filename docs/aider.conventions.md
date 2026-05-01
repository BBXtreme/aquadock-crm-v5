# Conventions (short) — AquaDock CRM v5

**Companion to** [`AIDER-RULES.md`](AIDER-RULES.md) — read that file for the full quality gate.  
**Last updated:** April 24, 2026  

| Topic | Rule |
| --- | --- |
| **TS** | No `!`, no `as any` |
| **Lint / format** | Biome only (`pnpm check:fix`) |
| **Forms / API bodies** | Zod in `src/lib/validations/`, `.strict()` at boundaries |
| **Mutations** | Prefer Server Actions; Route Handlers only for HTTP/JSON contract needs. Errors: Zod + German UX, `handleSupabaseError` for DB, no raw hints to clients — see [`architecture.md`](architecture.md#server-action-errors-and-user-facing-feedback) |
| **Data** | Server Supabase client + RLS; service role never in the browser |
| **UI** | `Control<T>` with RHF; match existing shadcn/tailwind patterns |
| **Large `Client*Page`** | Colocate domain hooks + sections under `components/features/<domain>/` (see [`folder-conventions.md`](folder-conventions.md)) |
| **i18n** | `src/messages/*`; `pnpm messages:validate` after key edits; German UX: informal **Du**, see [`german-du-style.md`](german-du-style.md) |
| **PR** | `typecheck` + `check:fix` + tests when logic/UI changes |
| **Tests** | [`testing-strategy.md`](testing-strategy.md) — Vitest vs Playwright |
| **In-app changelog** | User-facing release notes live in `src/content/changelog.ts`. When bumping the app version, add an entry (see [README — Maintaining the In-App Changelog](../README.md#maintaining-the-in-app-changelog) and [`CHANGELOG_ENTRY_TEMPLATE.md`](CHANGELOG_ENTRY_TEMPLATE.md)). |

**Branch names:** `feature/…`, `fix/…`, `chore/…` (as in `README.md`).
