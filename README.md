# AquaDock CRM v5

Modern CRM for marinas, hotels, restaurants & water-sports businesses  
**Next.js 16 • React 19 • Supabase • Tailwind v4 • shadcn/ui (radix-nova)**

## Tech Stack

| Layer            | Technology                              | Version / Note                  |
|------------------|-----------------------------------------|---------------------------------|
| Framework        | Next.js                                 | 16.2+ (App Router)              |
| UI               | React 19 • shadcn/ui (radix-nova)       | latest • CSS variables enabled  |
| Styling          | Tailwind CSS                            | exactly 4.2.2 (config-less)     |
| Fonts            | Geist Sans + Mono                       | official Vercel package         |
| State / Data     | TanStack React Query + Table v8         | v5 / v8                         |
| Forms            | react-hook-form + zod                   | —                               |
| Backend / DB     | Supabase (PostgreSQL + Auth + RLS)      | —                               |
| Toasts           | sonner                                  | ^2.0+                           |
| Icons            | lucide-react                            | latest                          |
| Package Manager  | pnpm                                    | —                               |
| Linting/Formatting | Biome                                 | 2.3.8+                          |
| Other            | next-themes, vaul, cmdk, zustand        | —                               |

## Features

- Multi-user CRM with Row Level Security
- Companies + Contacts separation
- Timeline & reminders per company
- Geo data (lat/lon, OSM integration)
- Import from CSV & OpenStreetMap POIs
- Responsive dashboard & data tables
- Dark mode & theme persistence

## Getting Started

# 1. Clone & enter directory
git clone <your-repo-url> aquadock-crm
cd aquadock-crm

# 2. Install dependencies
pnpm install

# 3. Copy example environment file
cp .env.example .env.local

# 4. Fill required Supabase variables

#    → SUPABASE_URL

#    → SUPABASE_ANON_KEY

#    → optionally: SUPABASE_SERVICE_ROLE_KEY (for admin scripts)

# 5. Start development server
pnpm dev
Open http://localhost:3000
Core Commands
Bashpnpm dev             # development server
pnpm build           # production build
pnpm start           # run production build
pnpm check           # biome lint + type check
pnpm format          # format all files
pnpm check:fix       # lint + auto-fix

## Development Guidelines

Root app/layout.tsx → Server Component only
Interactive components → "use client" at top
Data fetching → Server Components + Supabase server client
Forms → react-hook-form + zod resolver
Tables → TanStack Table v8 with generated types
UI components → src/components/ui/* (shadcn convention)
Supabase services → src/lib/supabase/services/*.ts

## Folder Structure (main folders only)

textsrc/
├── app/                  # App Router routes + layouts
├── components/
│   ├── ui/               # shadcn primitives
│   ├── layout/           # reusable layout pieces
│   └── features/         # domain components (CompanyCard, Timeline, etc.)
├── lib/
│   ├── supabase/         # client factory, services, types
│   └── utils/            # cn(), formatters, helpers
├── hooks/                # custom hooks
└── types/                # global type declarations

## Deployment

Recommended: Vercel (automatic previews, env vars, Supabase edge functions compatible)
Bashvercel

# or connect GitHub repo → Vercel dashboard
Supabase Schema & Types
See docs/SUPABASE_SCHEMA.md

After schema changes:
Bashnpx supabase gen types typescript --local > src/lib/supabase/database.types.ts
Contributing

Branch naming: feature/xxx, fix/xxx, chore/xxx
Commit messages: conventional commits preferred
Run pnpm check before push


# Start of day / after git pull
pnpm install    # if package.json changed

# Normal coding (99% of the time)
pnpm dev

# Every few minutes or before commit
# (many people have this as pre-commit hook already)
pnpm check:fix

# Before git push / creating PR
pnpm check
pnpm build      # optional but recommended for bigger changes

# Deploy / release
pnpm build      # Vercel does this automatically anyway


Built with ❤️ at Waterfront Beach • 2026