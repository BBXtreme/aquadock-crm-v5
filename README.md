# AquaDock CRM v5

Modern CRM for marinas, hotels, restaurants & water-sports businesses  
**Next.js 16 • React 19 • Supabase • Tailwind v4 • shadcn/ui (radix-nova)**

## Recent Refactor (March 2026)

- shadcn/ui updated to latest radix-nova style
- Biome upgraded & configured (minimal, Tailwind v4 compatible)
- Static loading skeletons cleaned (keys removed, proper static rendering)
- Type safety improved (no non-null assertions on env vars)
- Pre-commit hooks stabilized (Biome + typecheck)
- React Query caching & invalidation patterns standardized

**Next priorities**: full RHF + zod forms, mass-email sanitization, optimistic updates

## Tech Stack

| Layer              | Technology                         | Version / Note                 |
| ------------------ | ---------------------------------- | ------------------------------ |
| Framework          | Next.js                            | 16.2+ (App Router)             |
| UI                 | React 19 • shadcn/ui (radix-nova)  | latest • CSS variables enabled |
| Styling            | Tailwind CSS                       | exactly 4.2.2 (config-less)    |
| Fonts              | Geist Sans + Mono                  | official Vercel package        |
| State / Data       | TanStack React Query + Table v8    | v5 / v8                        |
| Forms              | react-hook-form + zod              | —                              |
| Backend / DB       | Supabase (PostgreSQL + Auth + RLS) | Full service layer pattern     |
| Toasts             | sonner                             | ^2.0+                          |
| Icons              | lucide-react                       | latest                         |
| Package Manager    | pnpm                               | —                              |
| Linting/Formatting | Biome                              | 2.3.8+                         |
| Other              | next-themes, vaul, cmdk, zustand   | All present                    |

> [!IMPORTANT]
>
> Protected routes are handled via root layout.tsx + Supabase Auth (no route groups). 

## Features

- Multi-user CRM with Row Level Security (RLS)
- Companies + Contacts separation
- Timeline & reminders per company
- Geo data (lat/lon, OSM integration)
- CSV import & OpenStreetMap POI import
- Responsive dashboard & TanStack Tables
- Dark mode & theme persistence

## Getting Started

1. Clone & enter directory
   ```bash
   git clone <your-repo-url> aquadock-crm
   cd aquadock-crm

1. Install dependencies

   Bash

   ```
   pnpm install
   ```

2. Copy example environment file

   Bash

   ```
   cp .env.example .env.local
   ```

3. Fill required Supabase variables

   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - (optional) SUPABASE_SERVICE_ROLE_KEY for admin tasks

4. Start development server

   Bash

   ```
   pnpm dev
   ```

   Open

    

   http://localhost:3000

## Core Commands

Bash

```
pnpm dev          # development server
pnpm build        # production build
pnpm start        # run production build
pnpm check        # biome lint + type check
pnpm format       # format all files
pnpm check:fix    # lint + auto-fix
```

## Development Guidelines

- Root app/layout.tsx → Server Component only
- Interactive components → "use client" at top
- Data fetching → prefer Server Components + Supabase server client
- Forms → react-hook-form + zod resolver
- Tables → TanStack Table v8 with generated types
- UI components → src/components/ui/* (shadcn convention)
- Supabase services → src/lib/supabase/services/*.ts

## Folder Structure (main folders)

text

```
src/
├── app/                          # ← Flat routes (no (dashboard) or (protected) group)
│   ├── companies/
│   ├── contacts/
│   ├── login/
│   ├── mass-email/
│   ├── profile/
│   ├── reminders/
│   ├── settings/
│   ├── timeline/
│   ├── layout.tsx                # root layout (Server Component)
│   └── page.tsx
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── layout/                   # ← Sidebar.tsx lives here
│   ├── features/                 # domain components
│   ├── dashboard/
│   ├── tables/
│   └── ErrorBoundary.tsx
├── lib/
│   ├── supabase/
│   │   └── services/
│   │       ├── companies.ts      # ← we will ONLY extend this
│   │       ├── contacts.ts
│   │       ├── reminders.ts
│   │       └── ...
│   └── utils/
├── hooks/
└── types/
```

### Visual Hierarchy in Your Project

Your current structure looks like this:

```
app/
├── layout.tsx                  ← Root Layout (Server)
│     └─ ClientLayout           ← Providers (Theme, Query, Toaster)
│           └─ AppLayout        ← Sidebar + Header + main
│                 └─ Page content (Companies, OpenMap, etc.)
```

## Deployment

**Recommended**: Vercel (automatic previews, env vars, Supabase edge functions compatible)

Bash

```
vercel
```

Or connect your GitHub repo directly in the Vercel dashboard.

## Supabase Schema & Types

See docs/SUPABASE_SCHEMA.md

After schema changes:

Bash

```
# Local Supabase
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts

# Remote (recommended for CI)
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/database.types.ts
```

## Contributing

- Branch naming: feature/xxx, fix/xxx, chore/xxx
- Commit messages: conventional commits preferred (feat:, fix:, chore:, etc.)
- Run pnpm check before push

### Daily Workflow

Bash

```
# Start of day / after git pull
pnpm install    # if package.json changed

# Normal development
pnpm dev

# Before commit (pre-commit hook should run this)
pnpm check:fix

# Before push / PR
pnpm check
pnpm build      # optional but recommended
```

### Dialoge Styling

<WideDialogContent size="2xl">   // very wide
<WideDialogContent size="lg">    // narrower
<WideDialogContent size="xl">    // balanced (recommended default)



Built with ❤️ at Waterfront Beach • 2026