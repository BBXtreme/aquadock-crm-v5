# Folder conventions — AquaDock CRM v5

**Last updated:** April 24, 2026  

This document complements [`architecture.md`](architecture.md) with **where to put new code**. Follow it for new features; legacy paths may still exist until migrated opportunistically.

---

## `src/app/`

- **Route segments only:** `page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`, and minimal composition (data fetch + pass props to feature components).
- **Avoid** large client components or feature-specific UI here—move them to `src/components/features/<domain>/` and import them.

---

## `src/components/`

| Path | Purpose |
| --- | --- |
| `components/ui/` | shadcn-style primitives and shared UI (buttons, cards, data-table shell). |
| `components/layout/` | App shell: header, sidebar, `AppLayout`. |
| `components/features/<domain>/` | **Default home** for domain UI: forms, lists, modals, page headers, **route-level list shells** (`Client*Page`), and **detail route clients** (`CompanyDetailClient`, `ContactDetailClient`, `DashboardClient`, etc.). |
| `components/features/companies/detail/` | Company detail route cards (header, KPIs, CRM blocks, comments, timeline, reminders, linked contacts). |
| `components/tables/`, `components/dashboard/`, `components/email/` | Shared feature-adjacent modules; keep cohesive and import from `features/` when the boundary blurs. |

**Large client list pages:** Keep the route shell (`Client*Page`) as **composition + wiring** (state, hooks, JSX). Push cross-cutting behavior into **colocated hooks** and **section components** in the same folder—e.g. under `features/companies/`: `use-companies-list-queries.ts`, `use-companies-list-url-sync.ts`, `use-companies-list-delete-mutation.ts`, `use-companies-geocode-batch.ts`, `CompaniesPageHeader`, `CompaniesListFilters`, `CompaniesTableBulkActions`. Name hooks with a **domain prefix** so grep and imports stay obvious.

**Error boundaries:** Use the class-based boundary in [`src/components/ErrorBoundary.tsx`](../src/components/ErrorBoundary.tsx). Auth forms around Supabase Auth UI use [`AuthFormErrorBoundary`](../src/components/features/auth/AuthFormErrorBoundary.tsx).

---

## `src/lib/`

- **`actions/`** — Server Actions (`"use server"`): thin; Zod re-parse then call services. Prefer **one primary module per domain** (e.g. `contacts.ts` for mutations; `services/contacts.ts` for list/detail helpers). **Import style:** use `@/lib/actions/<file>` in product code; [`actions/index.ts`](../src/lib/actions/index.ts) (`@/lib/actions`) is a full re-export barrel—OK for tests/scripts, but deep imports avoid pulling unrelated modules through a single entry.
  - **Next.js App Router:** If a module is **imported from client components**, put **`"use server"` at the top of the file** (not only inside individual `async function` bodies). Do not mix **client-safe re-exports** (e.g. functions that only need the browser Supabase client) in the same file as server-only actions—split into a dedicated file (examples: `create-reminder-action.ts` vs `reminders.ts` re-exporting service helpers; `contacts.ts` is server-only mutations).
- **`services/`** — Database and business logic shared by actions and route handlers.
- **`validations/`** — Zod schemas; single source of truth for form/server payloads.

---

## Types (`src/types/`)

- **`supabase.ts`** — Generated from the live Supabase schema (`pnpm supabase:types`). Do not hand-edit except by regenerating.
- **`database.types.ts`** — Barrel: re-exports `Database` and convenient aliases (`Company`, `Contact`, `Insert`/`Update` helpers, joined types). **Prefer this** for app and UI code.
- Import **`Json`** (and other generated-only utilities) from `@/types/supabase` when there is no alias in `database.types.ts`.

---

## SQL (`src/sql/`)

One-off or documented snippets (buckets, RLS notes) checked in for operators; not a substitute for Supabase migration history on the hosted project.

---

## Tests

- **Vitest:** `*.test.ts(x)` next to source or under `__tests__/`.
- **Playwright:** `tests/e2e/`.

See [`testing-strategy.md`](testing-strategy.md).
