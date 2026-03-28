# AquaDock CRM v5

Modern CRM for marinas, hotels, restaurants & water-sports businesses  
**Next.js 16 • React 19 • Supabase • Tailwind v4 • shadcn/ui (radix-nova)**

## 1. Recent Refactor (March 2026)

- shadcn/ui updated to latest radix-nova style
- Biome upgraded & configured (minimal, Tailwind v4 compatible)
- Static loading skeletons cleaned
- Type safety improved (no non-null assertions)
- **OpenMap fully refactored** to clean React + Leaflet with OSM POI import
- Pre-commit hooks stabilized (Biome + typecheck)
- React Query patterns standardized

**Next priorities**: full RHF + zod forms, mass-email sanitization, optimistic updates

## 2. Tech Stack

| Layer              | Technology                         | Version / Note                 |
| ------------------ | ---------------------------------- | ------------------------------ |
| Framework          | Next.js                            | 16.2+ (App Router)             |
| UI                 | React 19 • shadcn/ui (radix-nova)  | latest • CSS variables enabled |
| Styling            | Tailwind CSS                       | exactly 4.2.2 (config-less)    |
| Fonts              | Geist Sans + Mono                  | official Vercel package        |
| State / Data       | TanStack React Query + Table v8    | v5 / v8                        |
| Mapping            | Leaflet + react-leaflet            | OSM Overpass integration       |
| Backend / DB       | Supabase (PostgreSQL + Auth + RLS) | Full service layer pattern     |
| Toasts             | sonner                             | ^2.0+                          |
| Icons              | lucide-react                       | latest                         |
| Package Manager    | pnpm                               | —                              |
| Linting/Formatting | Biome                              | 2.4.9+                         |
| Other              | next-themes, vaul, cmdk, zustand   | All present                    |

> [!IMPORTANT]
> Protected routes are handled via root `app/layout.tsx` + Supabase Auth + sidebar wrapper. Flat app structure (no route groups).

## 3. Features

- Multi-user CRM with Row Level Security (RLS)
- Companies + Contacts separation
- Timeline & reminders per company
- **Interactive OpenMap** with colored company markers + OSM POI import (zoom ≥ 13)
- Geo data (lat/lon, water distance calculation)
- CSV import & OpenStreetMap POI import
- Responsive dashboard & TanStack Tables
- Dark mode & theme persistence

## 4. Getting Started

1. Clone & enter directory
   ```bash
   git clone <your-repo-url> aquadock-crm
   cd aquadock-crm

1. Install dependencies

   Bash

   ```
   pnpm install
   ```

2. Copy environment file

   Bash

   ```
   cp .env.example .env.local
   ```

3. Configure Supabase variables

   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - (optional) SUPABASE_SERVICE_ROLE_KEY

4. Start development server

   Bash

   ```
   pnpm dev
   ```

   Open

    

   http://localhost:3000

## 5. Core Commands

Bash

```
pnpm dev          # development server
pnpm build        # production build
pnpm start        # run production build
pnpm check        # biome lint + type check
pnpm format       # format all files
pnpm check:fix    # lint + auto-fix
```

## 6. Development Guidelines

- Root app/layout.tsx → Server Component only
- Interactive components → "use client" at top
- Data fetching → prefer Server Components + Supabase server client
- Map/OSM logic → direct browser fetches to Overpass
- All company logic must go through src/lib/supabase/services/companies.ts
- Forms → react-hook-form + zod resolver
- Tables → TanStack Table v8 with generated types + satisfies
- Use safeDisplay from @/lib/utils/data-format for all null/empty fallbacks. Never use ! assertions. For static skeletons use static string keys.
- Strictly follow AIDER-RULES.md on every change

## 7. Folder Structure

text

```
src/
├── app/                          # Flat routes
│   ├── companies/
│   ├── openmap/                  # ← OpenMap page
│   ├── contacts/
│   ├── reminders/
│   ├── layout.tsx                # Root layout
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── layout/                   # Sidebar, Header
│   ├── features/
│   │   └── map/                  # OpenMapClient, OpenMapView, popups
│   └── ErrorBoundary.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── browser.ts
│   │   └── services/companies.ts
│   └── utils/
│       └── map.ts
├── lib/constants/
│   ├── map-poi-config.ts
│   ├── map-status-colors.ts
│   ├── kundentyp.ts
│   └── wassertyp.ts
└── hooks/
```

## 8. Deployment

**Recommended**: Vercel

Bash

```
vercel
```

## 9. Supabase Schema & Types

See SUPABASE_SCHEMA.md

After schema changes:

Bash

```
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

## 10. Contributing

- Branch naming: feature/xxx, fix/xxx, chore/xxx
- Run pnpm check:fix before commit
- Run pnpm build after type changes

Built with ❤️ at Waterfront Beach • 2026