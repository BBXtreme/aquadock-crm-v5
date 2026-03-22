# AIDER RULES – AQUADOCK CRM v5 (March 2026 – Final Stable)

You are **strictly bound** by these rules on every single change.  
They protect the core (companies page + Supabase layer) and prevent all previous Biome/parse/TS issues.

### 1. Core Stack (Locked – Never Change)
- Next.js 16+ (App Router)
- React 19+
- Tailwind CSS **exactly 4.2.2** (config-less)
- shadcn/ui (radix-nova style)
- Biome 2.4.8+ for linting/formatting
- pnpm

### 2. Tailwind v4 & Biome Rules
- No tailwind.config.js ever
- globals.css uses only `@import "tailwindcss";` + `@theme inline`
- For static loading skeletons (`Array.from({ length: N })`):
  - **Always remove the `key` prop** (React does not need it)
  - Use `() => (` – never `(_, i) =>`
  - Never add biome-ignore inside the map (causes Turbopack parse error)
  - If warning remains, add suppression **only outside** the map:
    {/* biome-ignore lint/correctness/useJsxKeyInIterable: static loading placeholders */}

### 3. Supabase Data Layer – Strict Boundaries (Future-Proof)
- **Never edit** these files unless explicitly told:
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/server-client.ts`
  - `src/lib/supabase/browser.ts`
  - `src/lib/supabase/database.types.ts` or `types.ts`
- All data fetching → use existing service functions in `src/lib/supabase/services/*.ts`
- New features → create **new functions** in the appropriate service file (e.g. `companies.ts`)
- Always use `createClient()` or `createServerClient()` – never raw Supabase imports
- RLS must be respected in every query

### 4. Companies Page & Table – Protected Core
- This is the **central heart** of the CRM
- When adding delete, select, bulk edit, new fields, filters, bid popup, etc.:
  - Never touch Supabase client/server files
  - Extend only via `src/lib/supabase/services/companies.ts`
  - Use `useQuery` + `useMutation` from react-query
  - Table columns → always use `satisfies ColumnDef<Company>[]` or explicit cast
  - Static skeletons → follow rule #2 exactly
- All new functionality must keep existing data flow intact

### 5. React-Query & TanStack Table Rules
- All data fetching → `useQuery({ queryKey, queryFn })`
- Mutations → `useMutation` with `queryClient.invalidateQueries`
- Table columns → prefer `satisfies ColumnDef<T>[]`
- Global error handling in `ReactQueryProvider`

### 6. General Rules
- "use client" only where needed
- Server Components preferred for initial data
- No unsafe `!` assertions on env vars
- Keep code clean – no commented old code
- When user says “follow standards” or “clean up”, apply these rules strictly

### Summary

Companies page = **protected core** → Aider knows not to break data flow

Supabase client/server layer = **locked** → future Aider sessions cannot touch them accidentally

Static skeletons = **standardized** (no keys, no inner comments) → no more parse/key wars

Biome noise = **handled** (downgraded noisy rules, auto-fix first, minimal config)

Type safety = **enforced** (no !, explicit types, tsc check before commit)

New functionality = **forced through services/** → future-proof, RLS-safe, consistent



**Last updated**: March 2026 (after full Biome + React-Query stabilization)

When the user says "follow standards" or "update rules", replace the file with this exact content.