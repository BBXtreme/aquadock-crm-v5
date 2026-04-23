# AquaDock CRM v5 — Architecture overview

**Last updated:** April 23, 2026  

This document explains how the application is structured so developers (and technical stakeholders) can navigate the codebase safely. **Non-developers:** read the “Big picture” section only; the rest is implementation detail.

---

## Big picture

1. **Users sign in** with Supabase Auth.  
2. **Pages** are mostly **React Server Components**: they load data on the server using a Supabase client that sees the user’s session.  
3. **Interactive pieces** (forms, maps, tables with client sorting) are **Client Components** (`"use client"`) and stay as small as possible.  
4. **Rules in the database (RLS)** restrict which rows each user can read or write; the app must still use the correct queries and filters (e.g. soft-delete).  
5. **Forms** are validated with **Zod** schemas that match the database types, then saved via **Server Actions**.  
6. **Locales** are provided with **next-intl** (`src/messages/`, provider under `src/lib/i18n/`); the protected shell wraps content in `I18nProvider` after `requireCrmAccess()` in `src/app/(protected)/layout.tsx`.

---

## Core principles

| Topic | Approach |
| --- | --- |
| Rendering | Next.js App Router; Server Components by default |
| Interactivity | `"use client"` only where needed |
| Data access | Server: `createServerSupabaseClient()` from `@/lib/supabase/server`; browser: `createClient()` from `@/lib/supabase/browser` for allowed cases (e.g. avatar upload) |
| Auth gates | `requireUser()` and `requireAdmin()` in `@/lib/auth/require-user` and `@/lib/auth/require-admin`; profile-aware shell uses `getCurrentUser()` (`@/lib/auth/get-current-user.ts`, request-cached) |
| Types | Generated `Database` types from Supabase + Zod-inferred form types |
| Validation | `src/lib/validations/` — `.strict()`, `.trim()`, enums from constants, UUIDs, `emptyStringToNull` for nullable columns |
| Business logic | `src/lib/services/` — reusable operations; Server Actions stay thin |
| Mutations | Server Actions in `src/lib/actions/` — re-validate with Zod before persisting |
| UI | shadcn/ui + Tailwind CSS v4 |
| Client state | TanStack Query where remote state needs caching/refetch |
| Quality | Biome + `tsc --noEmit`; no non-null assertions (`!`); use `safeDisplay` and helpers from `@/lib/utils/data-format` for empty/null UI |

---

## Validation (Zod)

- All forms use schemas from `src/lib/validations/`.  
- Schemas are the **single source of truth** for shape, validation, and mapping toward Supabase insert/update payloads (often via helpers like `toCompanyInsert`).  
- Keep schemas aligned with `src/types/supabase.ts` after migrations (`pnpm supabase:types`).

Former standalone DTO layers have been removed in favor of Zod + generated DB types.

---

## Data flow

```text
User → Page (Server Component) → requireUser() / data fetch → service layer → Supabase (RLS)
User → Form (Client) → Server Action → Zod.parse → service layer → Supabase
```

**Important:** Prefer loading sensitive or authoritative lists on the server. The OpenMap feature loads companies on the server; OSM POI calls go from the browser to Overpass (public data), by design.

---

## Mutations: Server Actions vs Route Handlers

| Use | Path | When |
| --- | --- | --- |
| **Default** | Server Actions in `src/lib/actions/` and `src/lib/services/` (`"use server"`) | New writes/updates from the app: forms, buttons, and anything that should run with the user’s session, `revalidatePath`, and Zod re-validation. |
| **API route** | `src/app/api/**/route.ts` | Legitimate **HTTP** surface: `fetch` from a client that expects JSON, public/internal endpoints, or patterns that are awkward as actions (e.g. some `GET` list proxies). Reuse the same service helpers and RLS-scoped `createServerSupabaseClient()`; never trust the client for authorization. |

**Rule of thumb:** add **Server Actions** first. Add a **Route Handler** only if you need a stable URL contract, `GET`+JSON, or a non-React caller (e.g. external tool calling your API on purpose).

**Existing routes** (companies, contacts, reminders, timeline, `send-test-email`, auth user) are historical or JSON-oriented; new features should not sprawl duplicate mutation paths without a reason noted in a PR.

### API route review checklist (for `src/app/api/**/route.ts`)

When adding or changing a handler, confirm:

1. **Session** — `createServerSupabaseClient()` and `getUser()` (or equivalent) before mutating; return `401` if unauthenticated unless the route is intentionally public.  
2. **RLS** — Prefer the user-scoped Supabase client; do not use the **service role** in route handlers except for a documented, audited exception.  
3. **Input** — Validate JSON/body with Zod (or the same rules as a matching Server Action), not ad hoc checks only.  
4. **Data shape** — Do not return raw service-role or internal error blobs to the client.  
5. **Duplication** — If the same write exists as a Server Action, keep behavior aligned or consolidate.

---

## Route groups and layout

- **`(auth)`** — Public routes (e.g. login); no full app chrome.  
- **`(protected)`** — Authenticated CRM: sidebar, header, and pages under routes like `/dashboard`, `/companies`, `/openmap`.  
- The **`(protected)/layout.tsx`** layout calls `requireCrmAccess()` once per segment tree (session + pending-user gates); individual pages use `requireUser()` or stricter checks as needed. Admin-only UI uses `requireAdmin()` inside the relevant Server Actions or pages.

---

## Geo and OpenMap

Companies with coordinates are loaded for the map via the service layer. OSM POIs and water-distance helpers run in the browser. See [`README_OpenMap.md`](README_OpenMap.md).

---

## Testing (Vitest + Playwright)

- **Vitest:** tests live next to code as `*.test.ts` / `*.test.tsx` or under `**/__tests__/**` (see `vitest.config.ts`). Run once with `pnpm test:run`, or watch with `pnpm test`; CI uses `pnpm test:ci` (coverage + verbose reporter). Large or branch-heavy files may be listed in `vitest` `coverage.exclude` and are still covered in spirit by E2E where noted.
- **E2E:** Playwright tests under `tests/e2e/` (`pnpm e2e` locally; `pnpm e2e:ci` in CI). Requires a running production build; CI runs the **e2e** job after **quality** (see `.github/workflows/ci.yml`). For authenticated flows, set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in repo secrets; smoke tests run without them.
- **`src/test/setup.ts`** runs for every file: JSDOM-friendly stubs where needed (e.g. `scrollIntoView`, `ResizeObserver`) and **`afterEach(() => cleanup())`** from **Testing Library** so each test tears down the last `render()` tree. Without that, repeated `render()` calls in one file can leave multiple roots in `document.body` and make queries like `getAllByRole(...)[0]` point at a stale instance.
- Prefer colocating `vi.mock(...)` for a feature with its tests; keep only cross-cutting mocks in `src/test/setup.ts` (today: `next/navigation`, browser Supabase client).

---

## Accessibility (a11y)

- Prefer **semantic HTML**, **visible focus** styles (Radix/shadcn defaults), and **keyboard** paths for primary flows (nav, dialogs, data tables).  
- **Command palette** (`⌘K` / `Ctrl+K`): search field and list are keyboard operable; keep new commands labeled and in logical groups.  
- When adding custom widgets, test with **keyboard-only** and a screen reader (VoiceOver / NVDA) on at least one browser. Deeper WCAG work can be ticketed as follow-up.

---

## Checks before you merge

Run:

```bash
pnpm typecheck && pnpm check:fix
```

Add tests when behavior is non-trivial (`pnpm test:run`). If you change translation keys under `src/messages/`, run `pnpm messages:validate` so `de`, `en`, and `hr` stay aligned.

CI on `main` / PRs runs typecheck, Biome, tests with coverage, a production build, and the Playwright E2E job (see `.github/workflows/ci.yml`; **Node 22**, **pnpm 10**).

---

AquaDock CRM v5 · 2026
