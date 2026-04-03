# AquaDock CRM v5 – Architecture Overview

**Last updated**: April 2026  
**Goal**: Clean separation of concerns, maximum type safety, RLS enforcement, professional form validation with Zod + Supabase

## 1. Core Principles

- **App Router** (Next.js 16+) with Server Components by default
- **Interactive parts** → `"use client"` only where necessary
- **Data fetching** → Server Components + Supabase server client
- **Type safety** → Generated Supabase types (`supabase.ts`) + Zod schemas as **single source of truth** for forms
- **Form Validation** → React Hook Form + Zod (`src/lib/validations/`) with `.strict()`, `.trim()`, enums from constants, UUID validation, and empty-string → `null` transforms
- **Error handling** → centralized via `handleSupabaseError`
- **UI consistency** → shadcn/ui (radix-nova) + Tailwind v4.2.2
- **Auth** → Supabase Auth + RLS enforced in service layer
- **State management** → TanStack React Query 5
- **Suspense for data loading** → `useSuspenseQuery` + Suspense boundaries

## 2. Validation Strategy (Zod Layer – Current Standard)

- All forms use schemas from `src/lib/validations/`
- Zod schemas are the **single source of truth** for form shape, validation, and mapping to Supabase
- DTO files (`src/lib/dto/`) are being removed in this migration
- Schema rules (enforced):
  - `.strict()` – reject unknown fields
  - `.trim()` on all text inputs
  - `z.enum()` using values from `src/lib/constants/company-options.ts`
  - `z.string().uuid()` for IDs
  - `emptyStringToNull` transform for nullable DB columns
  - Inferred types: `type CompanyForm = z.infer<typeof companyFormSchema>`
- Schemas stay in sync with `supabase.ts` (Row / Insert / Update)

## 3. Data Flow & Service Layer

All database operations **must** go through `src/lib/supabase/services/`.

Supabase types (`supabase.ts`) define exact `Row`, `Insert`, `Update` shapes.  
Zod schemas → mapped to Supabase types via helper functions (`toCompanyInsert`, etc.) in the service layer.

## 4. Route Groups & Layout

- `(protected)` routes get full AppLayout (Sidebar + Header)
- `(auth)` routes stay clean (login only)
- All protected pages call `requireUser()` early

## 5. Geo & Mapping Layer (OpenMap)

- Companies loaded server-side via service layer
- OSM POIs & water distance calculations performed client-side
- No unnecessary API routes (performance + simplicity)

## 6. Helpers & Quality Rules

- Never use `!` non-null assertions
- Use `safeDisplay` from `@/lib/utils/data-format.ts` for null/empty handling
- Static string keys for all skeleton loaders
- Every single change **must** pass `pnpm typecheck && pnpm check:fix` with zero errors/warnings (see AIDER-RULES.md)

**Enforcement**: Strictly follow **AIDER-RULES.md** on every change (zero tolerance for type/lint errors).

Built with ❤️ at Waterfront Beach • 2026
