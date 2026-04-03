# AquaDock CRM v5 – Architecture Overview

**Last updated**: March 2026  
**Goal**: Clean separation of concerns, type safety, RLS respect, good DX, maintainable at scale

## 1. Core Principles

- **App Router** (Next.js 16+) with Server Components by default
- **Interactive parts** → `"use client"` only where necessary
- **Data fetching** → prefer Server Components + Supabase server client
- **Type safety** → generated Supabase types + strict TS (no `!` assertions)
- **Error handling** → centralized via `handleSupabaseError`
- **UI consistency** → shadcn/ui (radix-nova) + Tailwind v4.2.2
- **Auth** → Supabase Auth + RLS enforced in service layer
- **State management** → TanStack React Query for mutations, caching and optimistic updates
- **Suspense for data loading** → useSuspenseQuery for automatic loading states, with Suspense boundaries for fallbacks

### Route Groups (Next.js 16 App Router)

- (protected) – All authenticated pages get AppLayout (Sidebar + Header)
- (auth) – Login page stays clean (no sidebar)
- URLs remain unchanged (/dashboard, /companies, etc.)
- No extra path segments in browser

### Layout Hierarchy

- src/app/layout.tsx → Root (Server) – Fonts, ClientLayout, ErrorBoundary
- src/app/(protected)/layout.tsx → Protected Layout – Wraps AppLayout
- AppLayout.tsx → Client Component – Handles collapse, mobile, and hides UI on auth pages

### Authentication Flow

1. Proxy checks session for protected paths
2. Protected pages call requireUser() (server component)
3. getCurrentUser() joins profiles table for role + display_name
4. requireAdmin() for admin-only features
5. Login page handles redirectTo from middleware

### Guiding Principles Applied

- **Auth before data**: requireUser() is called before any data fetching
- **Single source of truth**: profiles table + Supabase auth.users
- **Server-first**: Protection happens in server components and middleware

## 3. Data Flow Patterns

| Scenario                  | Approach                                | Notes                        |
| ------------------------- | --------------------------------------- | ---------------------------- |
| Page data (companies)     | Server Component + service layer        | RLS-safe                     |
| OpenMap companies         | getCompaniesForOpenMap() in page.tsx    | Passed as prop               |
| OSM POIs / water distance | Direct browser fetch to Overpass        | Lightweight, no API route    |
| POI Import                | Browser client + service + custom event | Refreshes map                |
| Mutations                 | Service layer + React Query             | Optimistic updates supported |
| Dashboard stats           | useSuspenseQuery in client component    | Suspense boundary for loading |
| Suspense for data loading | useSuspenseQuery + Suspense boundary    | Throws on error, catches in Suspense; automatic loading states |

## 4. Geo & Mapping Layer (OpenMap)

- Companies fetched server-side
- OSM POIs & water calculations performed client-side
- Utilities centralized in lib/utils/map.ts
- Rich popups with import + water info actions
- Caching + debouncing + multi-mirror fallback
- **No API routes** – intentional (see OpenMap documentation for reasoning)

## 5. Service Layer (Protected)

All database operations **must** go through src/lib/supabase/services/companies.ts (and similar files). Never put raw Supabase queries in pages or components.

**Example**:

TypeScript

```
export async function getCompaniesForOpenMap() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, firmenname, kundentyp, status, lat, lon, ...")
    .not("lat", "is", null)
    .not("lon", "is", null);

  if (error) throw handleSupabaseError(error, "Failed to load map companies");
  return data ?? [];
}
```

## 6. Helpers & Debugging

- **Centralized safeDisplay from @/lib/utils/data-format.ts is the single source of truth for null/empty fallbacks. Never use ! assertions. Use static string keys for all skeleton loaders.**
- **React Query Devtools**: Enabled in development only for inspecting queries, cache and mutations.
- **Error handling**: Always use handleSupabaseError – centralized toasts + logging.
- No non-null assertions (!). Always use safe checks or safeDisplay. For static skeletons use static string keys to satisfy Biome noArrayIndexKey rule.
- Static string keys for skeleton loaders to satisfy Biome noArrayIndexKey rule.
- Forms use React Hook Form + Zod schemas from @/lib/validations/ with input sanitization (.trim(), .max(), .enum()). 
- Detail queries are optimized with selective column selection. Auth and RLS will be added later.

## 7. Validation Layer (Zod as Single Source of Truth)

- All forms use React Hook Form + Zod schemas from `src/lib/validations/`
- Schemas are `.strict()`, use `.trim()`, `.email()`, `.uuid()`, and enums pulled from `src/lib/constants/*Options.ts`
- Empty strings from forms are transformed to `null` for nullable Supabase columns
- Server Actions / Services always run `schema.safeParse()` before database operations
- Inferred types (`z.infer<typeof companyFormSchema>`) replace old DTOs
- `user_id` is **never** accepted from client forms – injected server-side for RLS compliance

## 8. Auth & Authorization

- Supabase Auth for authentication
- `public.profiles` table as single source of truth for role (`user` | `admin`), display_name, avatar_url
- Server helpers: `requireUser()`, `requireAdmin()`, `getCurrentUser()`
- RLS policies enforce "Auth before data"
- Never use `user_metadata` for authorization (security)

## 9. Styling & Theming

- Tailwind v4.2.2 (config-less)
- Dark mode via next-themes
- Single client wrapper for providers

**Enforcement**: Strictly follow **AIDER-RULES.md** on every change (zero tolerance for type/lint errors).
