# AquaDock CRM v5

Modern CRM for marinas, hotels, restaurants & water-sports businesses  
**Next.js 16 • React 19 • Supabase • Tailwind v4 • shadcn/ui (radix-nova)**

## Features

- **Company Management**: Create, edit, and track companies with detailed information
- **Contact Management**: Manage contacts associated with companies
- **Interactive Map (OpenMap)**: Visualize companies and import OSM POIs
- **Reminders & Tasks**: Schedule and track follow-ups
- **Email Integration**: Send emails with templates
- **Timeline**: Activity logging and history
- **Dashboard**: KPIs and statistics with period filtering
- **Mass Email**: Bulk email sending with templates
- **Settings**: User preferences and SMTP configuration
- **Profile**: Display name + profile photo (Supabase Storage `avatars` bucket)
- Multi-user CRM with Row Level Security (RLS)
- Companies + Contacts separation
- Timeline & reminders per company
- **Interactive OpenMap** with colored company markers + OSM POI import (zoom ≥ 13)
- Geo data (lat/lon, water distance calculation)
- CSV import & OpenStreetMap POI import
- Responsive dashboard & TanStack Tables
- Dark mode & theme persistence

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

## 3. Getting Started

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

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (optional) `SUPABASE_SERVICE_ROLE_KEY` — server-only; required for some admin flows

4. Storage (profile avatars)

   For **Profile → photo upload** and header avatars, create the public `avatars` bucket and storage policies once per Supabase project. In the Supabase dashboard → **SQL Editor**, run:

   [`src/sql/storage-avatars-bucket.sql`](src/sql/storage-avatars-bucket.sql)

   Details: [`docs/SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md) (section *Supabase Storage – avatars bucket*).

5. Start development server

   Bash

   ```
   pnpm dev
   ```

   Open `http://localhost:3000`.

## 4. Documentation

- [Architecture Overview](docs/architecture.md)
- [Supabase Schema](docs/SUPABASE_SCHEMA.md)
- [OpenMap Documentation](docs/README_OpenMap.md)
- [React Table Patterns](docs/react-table-v8-ts-tricks.md)
- [Aider Rules](docs/AIDER-RULES.md)
- [Aider Conventions](docs/aider.conventions.md)

## 5. Core Commands

Bash

```
pnpm dev          # development server "NODE_OPTIONS=\"--max-old-space-size=8192\" next dev"
pnpm build        # production build
pnpm start        # run production build
pnpm check        # biome lint + type check
pnpm format       # format all files
pnpm check:fix    # lint + auto-fix
supabase:types:   # "mkdir -p src/types && npx supabase gen types typescript --project-id bqsdrmlyctqxxflhhqbr --schema public > src/types/supabase.ts"

    "dev:large": "NODE_OPTIONS=\"--max-old-space-size=12288\" next dev",
    "build": "NODE_OPTIONS=\"--max-old-space-size=8192\" next build",
    "build:large": "NODE_OPTIONS=\"--max-old-space-size=12288\" next build",
    "start": "next start",
    "lint": "biome lint",
    "pre-commit": "lint-staged",
    "format": "biome format --write",
    "check": "biome check",
    "check:fix": "biome check --write --unsafe",
    "check:quick": "biome check --write --max-diagnostics=50",
    "typecheck": "tsc --noEmit --pretty",
    "prepare": "husky",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "version": "changeset version",
    "release": "changeset publish"
```

## 6. Development Guidelines

- Root app/layout.tsx → Server Component only
- Interactive components → "use client" at top
- Data fetching → prefer Server Components + Supabase server client
- Map/OSM logic → direct browser fetches to Overpass
- Forms → react-hook-form + zod resolver
- Tables → TanStack Table v8 with generated types + satisfies
- Always use safeDisplay(value) from @/lib/utils/data-format for table cells and cards. Static skeletons must use predefined string keys (e.g. 'dashboard-skeleton-1') to satisfy Biome noArrayIndexKey rule.
- Use safeDisplay from @/lib/utils/data-format.ts for all null/empty fallbacks. Never use ! assertions. For static skeletons use static string keys.
- Strictly follow AIDER-RULES.md on every change
- Input sanitization: All forms use Zod with .trim() and length limits. 
- Static skeletons use predefined string keys. No ! assertions allowed.

## 7. Folder Structure

text

```
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
└── hooks/
│ proxy.ts


src/lib/
├── actions/                    # ← All Server Actions (thin layer)
│   ├── companies.ts
│   ├── contacts.ts
│   ├── reminders.ts
│   ├── timeline.ts
│   ├── email-log.ts
│   ├── mass-email.ts
│   ├── auth.ts                 # signOut, etc.
│   └── index.ts                # optional barrel
│
├── validations/                # ← Zod schemas (single source of truth)
│   ├── company.ts
│   ├── contact.ts
│   ├── reminder.ts
│   ├── email.ts
│   └── index.ts
│
├── supabase/                   # ← Pure Supabase clients & low-level utils
│   ├── browser.ts              # createClient() for client components
│   ├── server.ts               # createServerSupabaseClient()
│   ├── admin.ts                # createAdminClient() (service role)
│   ├── types.ts                # CookieOptions, custom Supabase types
│   ├── utils.ts                # handleSupabaseError, safeDisplay, formatDateDE, etc.
│   └── proxy.ts                # session/cookie proxy (if needed)
│
├── services/                   # ← Complex business logic & reusable operations
│   ├── email.ts                # mass email logic, placeholder filling, recipient queries
│   ├── smtp.ts                 # SMTP config handling
│   └── ...                     # only heavy, reusable, non-action logic
│
├── query/                      # ← TanStack Query setup (if used heavily)
│   ├── provider.tsx
│   └── keys.ts                 # query key constants
│
├── utils/                      # ← Pure utilities (no DB, no side effects)
│   ├── cn.ts
│   ├── csv-import.ts
│   ├── data-format.ts
│   └── constants/              # company-options.ts, etc.
│
├── auth/                       # ← Auth-specific helpers (optional, but clean)
│   ├── get-current-user.ts
│   ├── require-user.ts
│   ├── require-admin.ts
│   └── types.ts
│
└── types/                      # ← Global TypeScript types (outside lib if preferred)
    ├── database.types.ts
    └── index.ts
```

## 8. Deployment

**Recommended**: Vercel

Bash

```
vercel
```

## 9. Supabase Schema & Types

See [`docs/SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md) (database tables, RLS overview, **Storage `avatars`**, type generation).

After **public** schema changes:

```bash
pnpm supabase:types
```

(Regenerates `src/types/supabase.ts`; project types re-export from `src/types/database.types.ts`. Replace the project id in `package.json` → `scripts.supabase:types` if you use a different Supabase project.)

## 10. Routing & Layout

We use Next.js App Router with **route groups** for clean separation:

- `(auth)` → Public pages (login)
- `(protected)` → All authenticated pages (automatically get Sidebar + Header)

This gives us:
- Clean URLs
- Automatic layout wrapping
- Easy protection with `requireUser()`

## 11. Contributing

- Branch naming: feature/xxx, fix/xxx, chore/xxx
- Run pnpm check:fix before commit
- Run pnpm build after type changes

Built with ❤️ at Waterfront Beach • 2026
