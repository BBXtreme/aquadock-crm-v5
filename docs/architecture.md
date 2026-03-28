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

## 2. Current Folder Structure (Flat App Router)

```markdown
src/
├── app/                          # Flat routes – no route groups
│   ├── companies/
│   ├── openmap/                  # Server fetch → OpenMapClient
│   ├── contacts/
│   ├── reminders/
│   ├── layout.tsx                # Root layout + auth
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── layout/                   # Sidebar + Header
│   ├── features/
│   │   └── map/                  # OpenMapClient, OpenMapView, popups
│   └── ErrorBoundary.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── browser.ts
│   │   └── services/companies.ts # Central service layer
│   └── utils/
│       ├── map.ts
│       ├── calculateWaterDistance.ts
│       └── data-format.ts        # safeDisplay, safeString, format helpers
├── lib/constants/
│   ├── map-poi-config.ts
│   ├── map-status-colors.ts
│   ├── kundentyp.ts
│   └── wassertyp.ts
└── hooks/
```

## 3. Data Flow Patterns

| Scenario                  | Approach                                | Notes                        |
| ------------------------- | --------------------------------------- | ---------------------------- |
| Page data (companies)     | Server Component + service layer        | RLS-safe                     |
| OpenMap companies         | getCompaniesForOpenMap() in page.tsx    | Passed as prop               |
| OSM POIs / water distance | Direct browser fetch to Overpass        | Lightweight, no API route    |
| POI Import                | Browser client + service + custom event | Refreshes map                |
| Mutations                 | Service layer + React Query             | Optimistic updates supported |

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

## 7. Styling & Theming

- Tailwind v4.2.2 (config-less)
- Dark mode via next-themes
- Single client wrapper for providers

**Enforcement**: Strictly follow **AIDER-RULES.md** on every change (zero tolerance for type/lint errors).

Built with ❤️ at Waterfront Beach • 2026
