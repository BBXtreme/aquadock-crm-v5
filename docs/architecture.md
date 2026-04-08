# AquaDock CRM v5 — Architecture overview

**Last updated:** April 2026  

This document explains how the application is structured so developers (and technical stakeholders) can navigate the codebase safely. **Non-developers:** read the “Big picture” section only; the rest is implementation detail.

---

## Big picture

1. **Users sign in** with Supabase Auth.  
2. **Pages** are mostly **React Server Components**: they load data on the server using a Supabase client that sees the user’s session.  
3. **Interactive pieces** (forms, maps, tables with client sorting) are **Client Components** (`"use client"`) and stay as small as possible.  
4. **Rules in the database (RLS)** restrict which rows each user can read or write; the app must still use the correct queries and filters (e.g. soft-delete).  
5. **Forms** are validated with **Zod** schemas that match the database types, then saved via **Server Actions**.

---

## Core principles

| Topic | Approach |
| --- | --- |
| Rendering | Next.js App Router; Server Components by default |
| Interactivity | `"use client"` only where needed |
| Data access | Server: `createServerSupabaseClient()`; browser: `createClient()` from `@/lib/supabase/browser` for allowed cases (e.g. avatar upload) |
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

## Route groups and layout

- **`(auth)`** — Public routes (e.g. login); no full app chrome.  
- **`(protected)`** — Authenticated CRM: sidebar, header, and pages under routes like `/dashboard`, `/companies`, `/openmap`.  
- Protected entry points should call `requireUser()` (or equivalent) early so unauthorized users never see data.

---

## Geo and OpenMap

Companies with coordinates are loaded for the map via the service layer. OSM POIs and water-distance helpers run in the browser. See [`README_OpenMap.md`](README_OpenMap.md).

---

## Checks before you merge

Run:

```bash
pnpm typecheck && pnpm check:fix
```

Add tests when behavior is non-trivial (`pnpm test:run`). CI on `main` / PRs runs typecheck, Biome, tests with coverage, and a production build (see `.github/workflows/ci.yml`).

---

AquaDock CRM v5 · 2026
