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

## 2. Current Folder Structure (App Router + Route Groups)

```markdown
src/app/
├── (auth)/
│   └── login/
│       └── page.tsx                 # Public login page (no sidebar/header)
├── (protected)/
│   ├── layout.tsx                   # Applies AppLayout (Sidebar + Header) to all protected routes
│   ├── dashboard/
│   ├── companies/
│   ├── contacts/
│   ├── timeline/
│   ├── reminders/
│   ├── mass-email/
│   ├── openmap/
│   ├── profile/
│   └── settings/
├── api/                             # All API routes (unaffected by route groups)
├── unauthorized/
├── layout.tsx              # Root layout (clean - only ClientLayout + ErrorBoundary)
├── page.tsx                         # Home → redirect to /dashboard
└── globals.css
├── components/
│   ├── ui/
│   ├── layout/                   # Sidebar + Header
│   ├── features/
│   │   ├── map/                  # OpenMapClient, OpenMapView, popups
│   │   ├── companies/
│   │   ├── contacts/
│   │   ├── reminders/
│   └── ErrorBoundary.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── browser.ts
│   │   ├── services/             # Central service layer
│   │   ├── database.types.ts     # Auto-generated types
│   │   └── query-debug-utils.ts
│   ├── dto/                      # Form-specific types
│   ├── validations/              # Zod schemas
│   ├── constants/
│   │   ├── company-options.ts    # Form options
│   │   ├── map-poi-config.ts
│   │   ├── map-status-colors.ts
│   │   ├── kundentyp.ts
│   │   ├── wassertyp.ts
│   │   └── overpass-endpoints.ts
│   └── utils/
│       ├── map-utils.ts
│       ├── calculateWaterDistance.ts
│       ├── csv-import.ts
│       ├── data-format.ts        # safeDisplay, safeString, format helpers
│       └── query-client.ts
└── hooks/
```

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

1. Middleware checks session for protected paths
2. Protected pages call requireUser() (server component)
3. getCurrentUser() joins profiles table for role + display_name
4. requireAdmin() for admin-only features
5. Login page handles redirectTo from middleware

### Guiding Principles Applied

- **Auth before data**: requireUser() is called before any data fetching
- **Single source of truth**: profiles table + Supabase auth.users
- **Server-first**: Protection happens in server components and middleware

## Protected Routes (Current)

All routes inside (protected) automatically receive:

- Sidebar navigation
- Header with user menu, notifications, theme toggle
- requireUser() protection (implemented per page)

Current protected pages:

- /dashboard
- /companies
- /contacts
- /timeline
- /reminders
- /settings
- /profile
- /mass-email
- /openmap



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

### 7. DTO Layer and Middleware

The DTO layer in `src/lib/dto/` provides form-specific types like `CompanyFormDTO` and `ContactFormDTO` to decouple form logic from database schemas, ensuring type safety in API interactions. Middleware in `src/proxy.ts` is set up for future authentication handling and route protection using Supabase Auth.

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

Built with ❤️ at Waterfront Beach • 2026
