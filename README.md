# AquaDock CRM v5

Modern CRM for marinas, hotels, restaurants & water-sports businesses  
**Next.js 16 • React 19 • Supabase • Tailwind v4 • shadcn/ui (radix-nova)**

## 1. Recent Major Improvements (March 2026)

### Email System
- Full DNS + syntax validation for test and mass emails
- MX record check for test emails (prevents sending to invalid domains)
- Improved spam score heuristics with German business context
- Rich email logging with `mode` ("test" / "mass"), `template_name`, `recipient_name`, `user_id`, `batch_id`, `spam_score`
- Better error handling and user feedback for bounces

### Database
- `email_log` table significantly enhanced
- Automatic `updated_at` triggers on major tables
- Performance indexes on companies, contacts and email_log
- Full-text search support prepared (`search_vector`)

### Mass Email
- Safe recipient filtering (invalid emails removed automatically)
- Clear feedback when emails are filtered
- Proper logging of test emails

## Tech Stack
- Next.js 16 (App Router + Turbopack)
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind + shadcn/ui
- TanStack Query
- Nodemailer + DNS validation

## Project Structure Highlights
- `src/lib/supabase/services/` → clean service layer
- `src/app/(protected)/mass-email/` → mass email feature
- Rich logging in `email_log` table

See `docs/` folder for detailed architecture and database schema.

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
- Forms → react-hook-form + zod resolver
- Tables → TanStack Table v8 with generated types + satisfies
- Always use safeDisplay(value) from @/lib/utils/data-format for table cells and cards. Static skeletons must use predefined string keys (e.g. 'dashboard-skeleton-1') to satisfy Biome noArrayIndexKey rule.
- Use safeDisplay from @/lib/utils/data-format.ts for all null/empty fallbacks. Never use ! assertions. For static skeletons use static string keys.
- Strictly follow AIDER-RULES.md on every change
- Input sanitization: All forms use Zod with .trim() and length limits. 
- Static skeletons use predefined string keys. No ! assertions allowed.

### DTOs and Middleware

- **DTO Pattern**: Introduced in `src/lib/dto/` to define form-specific data transfer objects (e.g., `CompanyFormDTO` and `ContactFormDTO`) for type-safe form handling and API interactions, separating form logic from database schemas.
- **Middleware**: `src/middleware.ts` added for future authentication and route protection, currently a placeholder for Supabase Auth integration.

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
│ middleware.ts
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
