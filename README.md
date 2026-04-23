# AquaDock CRM v5

**What it is:** A web-based CRM for marinas, hotels, restaurants, and water-sports businesses. Teams sign in, manage companies and contacts, plan reminders, send email campaigns, and view records on an interactive map. Data lives in **Supabase** (PostgreSQL) with **Row Level Security** so each user only sees their own records (admins have broader access where the schema allows).

**Product scope:** This is a **vertical, operations-focused** CRM (territory, accounts, comms, map). It is **not** a full enterprise “revenue platform” (no first-class deal pipeline, CPQ, or org/workspace tenancy in the data model as of v5). Roadmap and positioning details live in `docs/architecture.md` and `docs/SUPABASE_SCHEMA.md`.

**How it is built:** **Next.js 16** (App Router), **React 19**, **Supabase**, **Tailwind CSS v4**, **shadcn/ui**, **next-intl** (locales: German, English, Croatian), **pnpm**.

---

## Features

- **Companies & contacts** — Full lifecycle, search, CSV import, German-oriented fields (address, customer type, status); optional **AI enrichment** when [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) is configured (server-only keys — see deployment docs).
- **OpenMap** — Map of CRM companies plus optional **OpenStreetMap** POIs; import POIs as leads (zoom ≥ 13).
- **Reminders & timeline** — Tasks per company and activity history; soft-delete / trash workflows where implemented.
- **Email** — Templates, logging, mass email; optional **Brevo** integration for campaigns/sync (see `docs/BREVO_SDK.md`).
- **Dashboard** — KPIs and tables (**TanStack Table**).
- **Settings & profile** — Preferences, SMTP-related settings, display name and avatar (**Supabase Storage** bucket `avatars`).
- **Theming** — Dark/light mode and responsive layout.

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
| Quality | Biome, TypeScript strict | Run `pnpm check` / `pnpm typecheck` |
| Tests | Vitest, Testing Library | `pnpm test:run`; CI runs `pnpm test:ci` (shared setup in `src/test/setup.ts`; see **Testing** in `docs/architecture.md`) |

---

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url> aquadock-crm-v5
cd aquadock-crm-v5
pnpm install
```

Use **Node 22** and **pnpm 10+** (see [`.nvmrc`](.nvmrc) and `engines` in [`package.json`](package.json)) so your machine matches **CI** and the [Vercel runbook](docs/vercel-production.md#project-settings).

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

| Document | Audience | Content |
| --- | --- | --- |
| [architecture.md](docs/architecture.md) | Developers | Layers, validation, data flow, layout, Vitest/RTL testing |
| [SUPABASE_SCHEMA.md](docs/SUPABASE_SCHEMA.md) | Developers / DB admins | Tables (incl. `comments` / attachments), RLS overview, Storage, type generation |
| [README_OpenMap.md](docs/README_OpenMap.md) | Developers | Map and OSM POI behavior |
| [react-table-v8-ts-tricks.md](docs/react-table-v8-ts-tricks.md) | Developers | TypeScript patterns for tables |
| [production-deploy.md](docs/production-deploy.md) | DevOps / leads | Production checklist (Vercel + Supabase) |
| [vercel-production.md](docs/vercel-production.md) | DevOps | Shorter Vercel-focused checklist |
| [BREVO_SDK.md](docs/BREVO_SDK.md) | Developers | How this repo uses Brevo’s Node SDK |
| [AIDER-RULES.md](docs/AIDER-RULES.md) | All contributors | Coding-agent rules and non-negotiable quality gate |
| [aider.conventions.md](docs/aider.conventions.md) | All contributors | Short conventions companion to `AIDER-RULES.md` |

**Coding standards:** Enforced with Biome and TypeScript; see [`docs/AIDER-RULES.md`](docs/AIDER-RULES.md) for the full quality-gate rules. Optional AI/editor guidance lives under [`.cursor/rules/`](.cursor/rules/) (e.g. architecture, Supabase, Zod forms).

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

**E2E:** Set optional `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in `.env.local` (see [`.env.example`](.env.example)) to run the authenticated CRM tests in `tests/e2e/`; `pnpm build` is required first. On GitHub, add the same values as **repository secrets** for the CI e2e job. Smoke tests (login page, redirects) do not need credentials.

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

**Recommended:** [Vercel](https://vercel.com) connected to your Git repository. Use **pnpm** as the install command and align **Node** with CI (see `.github/workflows/ci.yml`, currently Node 22).

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
- Before opening a PR: `pnpm check:fix` and `pnpm typecheck` (and `pnpm test:run` when you touch logic or UI behavior). After editing translations, also run `pnpm messages:validate`.
- After schema changes: `pnpm supabase:types` and commit updated types if the project shares one Supabase project.

---

Built with care for Waterfront Beach · 2026
