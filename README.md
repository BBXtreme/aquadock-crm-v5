# AquaDock CRM v5

**What it is:** A web-based CRM for marinas, hotels, restaurants, and water-sports businesses. Teams sign in, manage companies and contacts, plan reminders, send email campaigns, and view records on an interactive map. Data lives in **Supabase** (PostgreSQL) with **Row Level Security** so each user only sees their own records (admins have broader access where the schema allows).

**How it is built:** **Next.js 16** (App Router), **React 19**, **Supabase**, **Tailwind CSS v4**, **shadcn/ui**, **pnpm**.

---

## Features

- **Companies & contacts** — Full lifecycle, search, CSV import, German-oriented fields (address, customer type, status).
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
| Quality | Biome, TypeScript strict | Run `pnpm check` / `pnpm typecheck` |
| Tests | Vitest, Testing Library | `pnpm test:run`; CI runs `pnpm test:ci` |

---

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url> aquadock-crm-v5
cd aquadock-crm-v5
pnpm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Set at least:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL from Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anonymous (public) key; safe for the browser within RLS rules.

Optional / server-only:

- `SUPABASE_SERVICE_ROLE_KEY` — **Never** expose to the client. Some admin or batch operations may need it; follow existing Server Actions and service code.

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
| [architecture.md](docs/architecture.md) | Developers | Layers, validation, data flow, layout |
| [SUPABASE_SCHEMA.md](docs/SUPABASE_SCHEMA.md) | Developers / DB admins | Tables, RLS overview, Storage, type generation |
| [README_OpenMap.md](docs/README_OpenMap.md) | Developers | Map and OSM POI behavior |
| [react-table-v8-ts-tricks.md](docs/react-table-v8-ts-tricks.md) | Developers | TypeScript patterns for tables |
| [production-deploy.md](docs/production-deploy.md) | DevOps / leads | Production checklist (Vercel + Supabase) |
| [vercel-production.md](docs/vercel-production.md) | DevOps | Shorter Vercel-focused checklist |
| [BREVO_SDK.md](docs/BREVO_SDK.md) | Developers | How this repo uses Brevo’s Node SDK |

**Coding standards:** Enforced with Biome and TypeScript; optional AI/editor guidance lives under [`.cursor/rules/`](.cursor/rules/) (e.g. architecture, Supabase, Zod forms).

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
| `pnpm supabase:types` | Regenerate `src/types/supabase.ts` (edit `--project-id` in `package.json` if you fork the DB) |

---

## Project layout (high level)

- `src/app/` — Routes: `(auth)` (e.g. login), `(protected)` (CRM pages with shell), `api/` routes.
- `src/lib/actions/` — Server Actions (thin; validate and call services).
- `src/lib/services/` — Business logic and Supabase access patterns shared by actions.
- `src/lib/validations/` — Zod schemas (single source of truth for forms).
- `src/lib/supabase/` — Browser and server Supabase clients.
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

Writes generated types to `src/types/supabase.ts`. App code imports through `src/types/database.types.ts` where applicable.

---

## Contributing

- Prefer branches such as `feature/…`, `fix/…`, `chore/…`.
- Before opening a PR: `pnpm check:fix` and `pnpm typecheck` (and `pnpm test:run` when you touch logic or UI behavior).
- After schema changes: `pnpm supabase:types` and commit updated types if the project shares one Supabase project.

---

Built with care for Waterfront Beach · 2026
