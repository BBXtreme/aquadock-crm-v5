# AquaDock CRM v5

**What it is:** A web-based CRM for marinas, hotels, restaurants, and water-sports businesses. Teams sign in, manage companies and contacts, plan reminders, send email campaigns, and view records on an interactive map. Data lives in **Supabase** (PostgreSQL) with **Row Level Security** so each user only sees their own records (admins have broader access where the schema allows).

**Product scope:** This is a **vertical, operations-focused** CRM (territory, accounts, comms, map). It is **not** a full enterprise “revenue platform” (no first-class deal pipeline, CPQ, or org/workspace tenancy in the data model as of v5). Roadmap and positioning details live in `docs/architecture.md` and `docs/SUPABASE_SCHEMA.md`.

**How it is built:** **Next.js 16** (App Router), **React 19**, **Supabase**, **Tailwind CSS v4**, **shadcn/ui**, **next-intl** (locales: German, English, Croatian), **pnpm**.

---

## Features

- **Companies & contacts** — Full lifecycle, search, CSV import, German-oriented fields (address, customer type, status); **`companies.land`** is stored as **ISO 3166-1 alpha-2** (see `src/lib/countries/iso-land.ts` and [`docs/SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md)). Optional **AI enrichment** when [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) is configured (server-only keys — see deployment docs).
- **OpenMap** — Map of CRM companies plus optional **OpenStreetMap** POIs; import POIs as leads (zoom ≥ 13).
- **Reminders & timeline** — Tasks per company and activity history; soft-delete / trash workflows where implemented.
- **Internal notes & comment attachments** — Threaded notes on a company; optional file uploads (private Storage bucket `comment-files`, metadata in `comment_attachments`) plus a company-level attachment list on the detail page.
- **Email** — Templates, logging, mass email; optional **Brevo** integration for campaigns/sync (see `docs/BREVO_SDK.md`).
- **Dashboard** — KPIs and tables (**TanStack Table**).
- **Settings & profile** — Preferences, SMTP-related settings, display name and avatar (**Supabase Storage** bucket `avatars`).
- **Theming** — Dark/light mode and responsive layout.
- **Command palette** — `⌘K` / `Ctrl+K` quick navigation (`AppCommandMenu` in the header; see `docs/architecture.md` → Accessibility).

---

## Tech stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Framework | Next.js 16+ | App Router, Server Components by default |
| UI | React 19, shadcn/ui | Radix-based components |
| Styling | Tailwind CSS 4.2.x | Project pins compatible versions in `package.json` |
| Data & cache | TanStack Query 5, TanStack Table 8 | Tables use strict TypeScript patterns (see `docs/react-table-v8-ts-tricks.md`) |
| Map | Leaflet, react-leaflet | Overpass API for OSM POIs (browser `fetch`) |
| Backend | Supabase | PostgreSQL, Auth, RLS, Storage |
| Forms | react-hook-form, Zod | Schemas in `src/lib/validations/` |
| i18n | next-intl | Message catalogs in `src/messages/` (`de`, `en`, `hr`) |
| Quality | Biome, TypeScript strict | Run `pnpm check` / `pnpm typecheck`. Repo layout for new code: [`docs/folder-conventions.md`](docs/folder-conventions.md) |
| Tests | Vitest, Testing Library, Playwright | **Strategy:** [`docs/testing-strategy.md`](docs/testing-strategy.md). Unit: `pnpm test:run` / `pnpm test:ci` (`src/test/setup.ts`). E2E: `tests/e2e/`, `pnpm e2e` — setup in `docs/architecture.md` **Testing** |

---

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url> aquadock-crm-v5
cd aquadock-crm-v5
pnpm install
```

Use **Node 24** (LTS) and **pnpm 10+** (see [`.nvmrc`](.nvmrc) and `engines` in [`package.json`](package.json)) so your machine matches **CI** and the [Vercel runbook](docs/vercel-production.md#project-settings). The repo pins `pnpm` via the `packageManager` field; with [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`), the correct version is selected automatically.

### 2. Environment

```bash
cp .env.example .env.local
```

Edit **`.env.local`** (gitignored) with your real values. The example file lists every variable the app may read; only Supabase URL + anon key are required for a minimal local run. Deeper checklists: [`docs/production-deploy.md`](docs/production-deploy.md), [`docs/vercel-production.md`](docs/vercel-production.md).

Set at least:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL from Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anonymous (public) key; safe for the browser within RLS rules.

Optional / server-only:

- `SUPABASE_SERVICE_ROLE_KEY` — **Never** expose to the client. Use only in trusted server code where RLS bypass is intentional.
- `SITE_URL` / `NEXT_PUBLIC_SITE_URL` — Canonical site origin for password recovery and similar flows; see [`docs/vercel-production.md`](docs/vercel-production.md).
- **AI enrichment (optional):** `AI_GATEWAY_API_KEY`; optional `AI_ENRICHMENT_XAI_API_KEY` (xAI BYOK via gateway), `AI_ENRICHMENT_GROK_MODEL` (fallback model id override), and `AI_ENRICHMENT_DAILY_LIMIT_DEFAULT` (per-user default daily quota). Documented in the deployment guides.

### 3. Storage (profile photos)

For avatar uploads, create the public **`avatars`** bucket and policies once per project. In the Supabase **SQL Editor**, run:

[`src/sql/storage-avatars-bucket.sql`](src/sql/storage-avatars-bucket.sql)

Details: [`docs/SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md) (Storage section).

### 4. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). If the dev server runs out of memory on large pages, try `pnpm dev:large`.

---

## Documentation (`docs/`)

Quick index: [`docs/README.md`](docs/README.md).

| Document | Audience | Content |
| --- | --- | --- |
| [testing-strategy.md](docs/testing-strategy.md) | Developers | **Vitest vs Playwright**, coverage exclusions, when to add which tests |
| [architecture.md](docs/architecture.md) | Developers | Stack principles, Server Actions vs API routes, **HTTP route inventory**, validation, testing, a11y |
| [SUPABASE_SCHEMA.md](docs/SUPABASE_SCHEMA.md) | Developers / DB admins | Tables, RLS, Storage `avatars`, Realtime, type generation, maintenance SQL |
| [README_OpenMap.md](docs/README_OpenMap.md) | Developers / product | OpenMap: CRM markers, OSM POIs, Overpass, import flow |
| [react-table-v8-ts-tricks.md](docs/react-table-v8-ts-tricks.md) | Developers | `ColumnDef` TypeScript patterns without `as any` |
| [production-deploy.md](docs/production-deploy.md) | DevOps / leads | Full go-live: env, Supabase, GitHub Actions + E2E, security, domain |
| [vercel-production.md](docs/vercel-production.md) | DevOps | Short Vercel + Supabase URL configuration checklist |
| [BREVO_SDK.md](docs/BREVO_SDK.md) | Developers | `@getbrevo/brevo` v5, env keys, error mapping |
| [AIDER-RULES.md](docs/AIDER-RULES.md) | All contributors | PR quality gate: TS, Zod, Biome, i18n, CI parity |
| [aider.conventions.md](docs/aider.conventions.md) | All contributors | One-page convention table (companion to AIDER-RULES) |

**Coding standards:** Biome + TypeScript strict; see [`docs/AIDER-RULES.md`](docs/AIDER-RULES.md). Editor/agent hints: [`.cursor/rules/`](.cursor/rules/) (architecture, Supabase, Zod/shadcn, Biome).

---

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server (raised Node heap for stability) |
| `pnpm dev:large` | Dev server with a larger heap if needed |
| `pnpm build` / `pnpm start` | Production build and run |
| `pnpm check` | Biome check (lint + format) |
| `pnpm check:fix` | Biome with auto-fix |
| `pnpm format` | Format with Biome |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm test` | Vitest (watch) |
| `pnpm test:run` | Vitest once |
| `pnpm test:ci` | Coverage + verbose reporter (matches CI) |
| `pnpm e2e` | Playwright E2E (starts production server from `playwright.config.ts` unless one is already running) |
| `pnpm e2e:ui` | Playwright with UI mode |
| `pnpm messages:validate` | Ensures `de` / `en` / `hr` message keys stay in sync (run after editing `src/messages/*.json`) |
| `pnpm supabase:types` | Regenerate `src/types/supabase.ts` (edit `--project-id` in `package.json` if you fork the DB) |

Vitest loads `src/test/setup.ts` for every test (global mocks, JSDOM stubs, and RTL `cleanup()` after each test so `render()` does not accumulate trees). Details: [`docs/architecture.md`](docs/architecture.md#testing-vitest--playwright).

**E2E (Playwright):** The suite expects a **production build** — run `pnpm build` before `pnpm e2e` (or use `playwright.config.ts`, which can start `next start` for you). **`playwright.config.ts`** uses `loadEnvConfig` from `@next/env`, so `E2E_BASE_URL`, `E2E_USER_EMAIL`, and `E2E_USER_PASSWORD` in **`.env.local`** are picked up by the Node process (no need to `export` them in the shell). Use a **real Supabase Auth** user: set the password in the **Supabase dashboard** (or Admin API), not with ad hoc SQL against `auth.users`. The test user should **not** be stuck on `/access-pending` (onboarding) or authenticated scenarios are skipped. **GitHub Actions:** add `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` as **repository secrets** (the workflow reads `secrets.E2E_*`); set `NEXT_PUBLIC_SUPABASE_*` as **Actions variables**. **Smoke** tests (login shell, root redirect) run without E2E credentials. Traces and reports under `test-results/` are gitignored.

---

## Project layout (high level)

- `src/app/` — Routes: `(auth)` (e.g. login), `(protected)` (CRM pages with shell), `api/` routes.
- `src/lib/actions/` — Server Actions (thin; validate and call services).
- `src/lib/services/` — Business logic and Supabase access patterns shared by actions.
- `src/lib/validations/` — Zod schemas (single source of truth for forms).
- `src/lib/supabase/` — Browser and server Supabase clients.
- `src/lib/auth/` — `requireUser()`, `requireAdmin()`, and related session helpers.
- `src/messages/` — next-intl JSON catalogs (`de.json`, `en.json`, `hr.json`).
- `src/components/` — UI primitives (`ui/`), layout, feature modules (`features/`).

A more detailed tree lived in older README versions; explore `src/app/(protected)/` for feature routes (`dashboard`, `companies`, `contacts`, `openmap`, `settings`, etc.).

---

## Deployment

**Recommended:** [Vercel](https://vercel.com) connected to your Git repository. Use **pnpm** as the install command and align **Node** with CI (see `.github/workflows/ci.yml`, currently Node 24).

Step-by-step checklists: [`docs/production-deploy.md`](docs/production-deploy.md) and [`docs/vercel-production.md`](docs/vercel-production.md).

---

## Supabase types after schema changes

```bash
pnpm supabase:types
```

Writes generated types to `src/types/supabase.ts`. App code should import row aliases (`Company`, `Contact`, …) and the `Database` type from [`src/types/database.types.ts`](src/types/database.types.ts), which re-exports the generated schema.

---

## Contributing

- Prefer branches such as `feature/…`, `fix/…`, `chore/…`.
- Before opening a PR: `pnpm check:fix` and `pnpm typecheck` (and `pnpm test:run` when you touch logic or UI behavior; after `pnpm build`, `pnpm e2e` if you change auth, login, or protected routes). After editing translations, run `pnpm messages:validate`. See [`docs/AIDER-RULES.md`](docs/AIDER-RULES.md) for the full checklist.
- After schema changes: `pnpm supabase:types` and commit updated types if the project shares one Supabase project.

### Maintaining the In-App Changelog

Every version bump must include a matching entry in `src/content/changelog.ts`. This keeps our users informed and excited about every improvement.

**Process (copy-paste friendly):**

1. Bump the version (via Changesets or directly in `package.json`).
2. Copy the template below into the **top** of the `changelogEntries` array (newest first).
3. Write **from the user’s perspective** — focus on benefits for **marina, hotel, restaurant, and water-sports** teams.
4. Run `pnpm typecheck && pnpm check:fix` — the Zod schema will catch any formatting issues.

**CHANGELOG ENTRY TEMPLATE** (paste & fill):

```ts
{
  version: "1.3.0",
  releasedAt: "2026-05-01",
  title: "🚀 Noch mehr Komfort & Geschwindigkeit für Deinen Alltag",
  changes: [
    {
      type: "feature",
      text: "Neuer In-App Changelog – Du siehst sofort, was sich verbessert hat und wie es Dir Zeit spart",
    },
    {
      type: "improvement",
      text: "OpenMap lädt noch schneller und zeigt klarere Cluster – perfekte Übersicht auf einen Blick",
    },
    {
      type: "fix",
      text: "Verbesserte Stabilität bei der AI-Anreicherung von Firmendaten",
    },
  ],
},
```

**Tips for great entries:**

- Start with an emoji in the title for visual pop (🚀 ✨ ⚡).
- Keep bullets short, warm, and benefit-driven.
- **German primary** (main market; informal **Du** — see [`docs/german-du-style.md`](docs/german-du-style.md)); **English** matches with direct *you*; **Croatian** with informal *ti*. English & Croatian translations can be expanded later via i18n extensions.
- **Maximum 6 bullets per release** to keep the spotlight delightful.

This template is also available as [`docs/CHANGELOG_ENTRY_TEMPLATE.md`](docs/CHANGELOG_ENTRY_TEMPLATE.md).

---

Built with care for Waterfront Beach · 2026
