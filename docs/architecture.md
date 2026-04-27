# AquaDock CRM v5 — Architecture overview

**Last updated:** April 28, 2026  

This document explains how the application is structured so developers (and technical stakeholders) can navigate the codebase safely. **Non-developers:** read the “Big picture” section only; the rest is implementation detail.

---

## Big picture

1. **Users sign in** with Supabase Auth.  
2. **Pages** are mostly **React Server Components**: they load data on the server using a Supabase client that sees the user’s session.  
3. **Interactive pieces** (forms, maps, tables with client sorting) are **Client Components** (`"use client"`) and stay as small as possible.  
4. **Rules in the database (RLS)** restrict which rows each user can read or write; the app must still use the correct queries and filters (e.g. soft-delete).  
5. **Forms** are validated with **Zod** schemas that match the database types, then saved via **Server Actions**.  
6. **Locales** are provided with **next-intl** (`src/messages/`, provider under `src/lib/i18n/`); the protected shell wraps content in `I18nProvider` after `requireCrmAccess()` in `src/app/(protected)/layout.tsx`. **ICU:** strings that must show literal `{{placeholder}}` text (e.g. mass-email hints) wrap each token in single quotes in JSON—`'{{vorname}}'`—so the message parser does not treat `{{…}}` as a malformed ICU argument (see [next-intl messages / escaping](https://next-intl.dev/docs/usage/messages#escaping)).

---

## Core principles

| Topic | Approach |
| --- | --- |
| Rendering | Next.js App Router; Server Components by default |
| Interactivity | `"use client"` only where needed |
| Data access | Server: `createServerSupabaseClient()` from `@/lib/supabase/server`; browser: `createClient()` from `@/lib/supabase/browser` for allowed cases (e.g. avatar upload) |
| Auth gates | `requireUser()` and `requireAdmin()` in `@/lib/auth/require-user` and `@/lib/auth/require-admin`; profile-aware shell uses `getCurrentUser()` (`@/lib/auth/get-current-user.ts`, request-cached) |
| Types | Generated types in `src/types/supabase.ts`; app code prefers aliases in `src/types/database.types.ts` (see [`folder-conventions.md`](folder-conventions.md)) |
| Validation | `src/lib/validations/` — `.strict()`, `.trim()`, enums from constants, UUIDs, `emptyStringToNull` for nullable columns |
| Business logic | `src/lib/services/` — reusable operations; Server Actions stay thin. **Email:** `email.ts` holds Supabase email log/template helpers and mass-email **client-safe** helpers (`fillPlaceholders`, `getMassEmailRecipients`, …). **Node-only** MX lookup for send validation lives in `email-mx.ts` (`node:dns`) and is imported from server actions only—keeps `next dev --webpack` from bundling Node built-ins into client chunks. |
| Mutations | Server Actions in `src/lib/actions/` — re-validate with Zod before persisting |
| UI | shadcn/ui + Tailwind CSS v4 |
| Client state | TanStack Query where remote state needs caching/refetch; **large list pages** colocate hooks + sections under `src/components/features/<domain>/` (see [`folder-conventions.md`](folder-conventions.md)) |
| Quality | Biome + `tsc --noEmit`; no non-null assertions (`!`); use `safeDisplay` and helpers from `@/lib/utils/data-format` for empty/null UI |
| CRM in-app + email | Bell feed + `/notifications` read `user_notifications` (RLS). **Client components** import list/unread/mark helpers from `src/lib/services/in-app-notifications-queries.ts` (no nodemailer). **Server** inserts and optional transactional email use `src/lib/services/in-app-notifications.ts` (service role + `smtp-delivery.ts` + `build-notification-email.ts`) when `notification_email_enabled` and SMTP are configured. Same event as in-app; no extra tables. **Details:** [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) (`user_notifications`, `user_settings`). |

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

**Rule of thumb:** add **Server Actions** first. Add a **Route Handler** only if you need a stable URL contract, `GET`+JSON, or a non-React caller (e.g. external tool calling your API on purpose). New features should not sprawl duplicate mutation paths without a reason noted in a PR.

### Server Action errors and user-facing feedback

When adding or changing mutations, keep failure behavior predictable and safe:

1. **Validation** — Re-parse payloads with the shared Zod schema in the action (`.strict()`). Surface field or summary messages in **German** for CRM users, or reuse keys from `src/messages/` where the UI already translates.
2. **Auth** — Use `requireUser()`, `requireAdmin()`, or equivalent; do not branch on raw JWT or session cookies in actions. Missing auth should redirect or fail with a consistent, non-leaky message—not internal IDs or stack traces in toasts.
3. **Supabase / RLS** — Prefer `handleSupabaseError()` from `@/lib/supabase/db-error-utils` for database failures. Do not forward Postgres `hint`, internal codes, or full error objects to the client in production; the app’s error boundary and logging can retain detail in development.
4. **Domain “not found” / empty RLS** — When a query legitimately returns no row for the user, throw or return a clear German message (e.g. entity missing or already moved to trash), distinct from generic “Something went wrong” where it helps support.

Apply this pattern **incrementally** when touching a domain’s actions; avoid repo-wide string replacement in a single change.

### Server Action modules and `"use server"` placement (Next.js)

Next.js (v16+) rejects **per-function** `"use server"` inside files that end up in the **client component import graph** (the compiler treats that as defining inline server actions in a client context). In this repo:

- Put **`"use server"` at the top of the file** for modules that export only server actions consumed from the client (e.g. `src/lib/actions/contacts.ts`).
- **Split** action-only code into a dedicated file when the same domain also needs **client-importable** helpers (e.g. `create-reminder-action.ts` for `createReminderAction`, while `reminders.ts` re-exports service-layer functions usable with the browser Supabase client).

Run **`pnpm build`** after changing action boundaries; typecheck alone does not catch this.

### API route review checklist (for `src/app/api/**/route.ts`)

When adding or changing a handler, confirm:

1. **Session** — `createServerSupabaseClient()` and `getUser()` (or equivalent) before mutating; return `401` if unauthenticated unless the route is intentionally public.  
2. **RLS** — Prefer the user-scoped Supabase client; do not use the **service role** in route handlers except for a documented, audited exception.  
3. **Input** — Validate JSON/body with Zod (or the same rules as a matching Server Action), not ad hoc checks only.  
4. **Data shape** — Do not return raw service-role or internal error blobs to the client.  
5. **Duplication** — If the same write exists as a Server Action, keep behavior aligned or consolidate.

### HTTP API inventory (`src/app/api/**`)

Hand-maintained; update when you add or remove a `route.ts`. All handlers use the user-scoped server Supabase client unless noted. Prefer **not** duplicating the same write as a Server Action without aligning validation and error shapes.

| Path | Methods | Role |
| --- | --- | --- |
| `/api/auth/me` | GET | Current user (`getCurrentUser()`); `401` if missing |
| `/api/auth/user` | GET | Minimal auth check (`getUser`); `401` if unauthenticated |
| `/api/companies` | POST | Create company: Zod + `toCompanyInsert`; `user_id` from session |
| `/api/companies/search` | POST | Company search (semantic / lexical) |
| `/api/companies/nav-ids` | POST | Resolve company ids for map/navigation |
| `/api/contacts/[id]` | GET, PUT, DELETE | Company-scoped contact row; PUT uses `contactSchema.partial().strict()` |
| `/api/reminders` | GET, POST | **Auth required**; POST delegates to reminder server action |
| `/api/timeline` | POST | New timeline entry; Zod body (`postTimelineBodySchema`) |
| `/api/timeline/[id]` | PUT, DELETE | Update or delete a timeline entry |
| `/api/send-test-email` | POST | Send test email (authenticated flows) |
| `/api/test-smtp` | POST | Test SMTP user settings; `401` if session/auth error |

**Removed in v5 maintenance:** `POST` handlers under `/api/companies/create` and `/api/companies/[id]` (obsolete duplicates of Server Actions; use actions + `POST /api/companies` for JSON create).

---

## Folder layout (components, types, actions)

For **where to place new files** (thin `app/` routes, `features/` vs legacy folders, types imports, actions naming), see **[`folder-conventions.md`](folder-conventions.md)**.

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

**Strategy (what to test where):** see **[`testing-strategy.md`](testing-strategy.md)** — Vitest for logic and mocked server paths; Playwright for real auth, RLS, and critical UI; how `coverage.exclude` relates to E2E.

- **Vitest:** tests live next to code as `*.test.ts` / `*.test.tsx` or under `**/__tests__/**` (see `vitest.config.ts`). Run once with `pnpm test:run`, or watch with `pnpm test`; CI uses `pnpm test:ci` (coverage + verbose reporter). Global thresholds: **85%** statements and lines, **80%** branches and functions, on **included** files only. Large or branch-heavy modules may appear in `coverage.exclude` with an inline reason; pair with E2E or targeted tests where noted. Examples: `src/lib/actions/companies-create.test.ts` exercises `createCompany` while `companies.ts` is excluded from the coverage gate; `src/lib/actions/mass-email.test.ts` covers guard rails while `mass-email.ts` is excluded (nodemailer/DNS batch branches).
- **E2E:** Playwright under `tests/e2e/` — `pnpm e2e` locally, `pnpm e2e:ci` in GitHub Actions. **`workers: 1`** (local and CI): one dev server cannot reliably handle several parallel browser sessions; otherwise navigations fail with **`net::ERR_ABORTED`**. **Local** runs: when nothing is listening on `localhost:3000`, the config starts **`next dev --webpack`** (not Turbopack) to avoid **Turbopack internal panics**; **`reuseExistingServer`** reuses a dev server you started manually (stop a Turbopack `pnpm dev` on :3000 first for stable E2E, or you may still see flakes). **CI** runs `pnpm build` in the workflow, then `next start` for the E2E job (production server, no Turbopack). **`playwright.config.ts`** calls `loadEnvConfig` from `@next/env`, so `E2E_BASE_URL`, `E2E_USER_EMAIL`, and `E2E_USER_PASSWORD` in **`.env.local`** are available to the Playwright process without shell `export`. **CI:** set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as **Actions variables**; set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` as **repository secrets** (`secrets.E2E_*` in the workflow). Use a real Supabase user who can password-sign in, is **not** blocked on `/access-pending`, and can **create companies** under RLS, or authenticated cases are skipped. **Helpers:** `tests/e2e/helpers/auth.ts` (login + signed-in wait) and `tests/e2e/helpers/locale.ts` set `localStorage` `aquadock_appearance_locale` to `en` before navigation so copy matches English assertions. **Specs:** `smoke.spec.ts` (public), `auth-edge.spec.ts` (invalid login), `crm-happy-path.spec.ts` (authenticated navigation smoke), `company-create.spec.ts` (create company + table search), `mass-email-ui.spec.ts` (mass email page UI, no send), `contacts-smoke.spec.ts` (open create-contact dialog). **Smoke** tests (no login) run without E2E secrets. Artifacts under `test-results/` are gitignored.
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

Add tests when behavior is non-trivial (`pnpm test:run`). Follow **[`testing-strategy.md`](testing-strategy.md)** for Vitest vs E2E. If you change translation keys under `src/messages/`, run `pnpm messages:validate` so `de`, `en`, and `hr` stay aligned.

CI on `main` / PRs runs typecheck, Biome, tests with coverage, a production build, and the Playwright E2E job (see `.github/workflows/ci.yml`; **Node 24**, **pnpm** version from `package.json#packageManager`).

---

AquaDock CRM v5 · 2026
