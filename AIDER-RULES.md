# AIDER RULES – AQUADOCK CRM v5 (March 2026 Standard)

You are strictly bound by these rules on **every single change**.  
They reflect the architecture of modern Next.js 16+ + shadcn/ui + Tailwind v4 dashboard projects.

### 1. Core Stack (Locked)
- Next.js 16+ (latest stable)
- React 19+
- Tailwind CSS **exactly 4.2.2** (pinned version)
- shadcn/ui latest – style = **radix-nova**, CSS variables = true
- TypeScript **strict mode** enabled
- Geist fonts via official `geist` package

### 2. Tailwind v4 Rules (Never Deviate)
- Pure config-less setup only
- `globals.css` may **only** contain:
  ```css
  @import "tailwindcss";
  @import "tw-animate-css";

No @tailwind base;, @tailwind components;, @tailwind utilities;
No tailwind.config.js/ts file ever
Theming only via @theme inline { … } using OKLCH colors
No @custom-variant dark — Tailwind v4 handles .dark natively
Remove any @import "shadcn/tailwind.css"

3. Architecture Rules (Strict Boundaries)

app/layout.tsxmust remain a pure Server Component (no hooks, no "use client")
Use one single ClientLayout wrapper for all client-side providers
(TooltipProvider, Toaster, theme provider, auth context, etc.)
Every component/page that uses hooks, state, effects, shadcn UI or interactivity must start with "use client";
Prefer Server Components for data fetching (Supabase queries)

4. Font Rules (Geist)

Install: pnpm add geist
Import exactly like this:tsximport { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
Apply in root layout:tsx<body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>

5. shadcn/ui Rules

Always install with: npx shadcn@latest add ... --overwrite
Style = radix-nova
Use cn() from @/lib/utils
All components live in src/components/ui/

6. Supabase Client & Types

Always import like this:TypeScriptimport { createClient, type SupabaseClient } from '@supabase/supabase-js';
Never use @supabase/supabase
Generated types: import from src/lib/supabase/database.types or src/lib/supabase/types
Centralize client creation:
createSupabaseClient()
createSupabaseServerClient() (for server components/actions)

Never hardcode env vars outside client creation files

7. TanStack React Table v8 – Column Typing Gotcha
Problem
createColumnHelper<T>() + const columns: ColumnDef<T>[] = […] often causes huge contravariant errors
(AccessorKeyColumnDef<…, string> not assignable to ColumnDef<…, unknown>).
Rule
Never commit a table without one of these annotations when seeing unknown/string/accessorFn mismatch errors.
Prefer order: 1 → 2 → 3
TypeScript// 1. Best – modern & clean (TS 4.9+)
const columns = [
  columnHelper.accessor("firmenname", { … }),
  columnHelper.accessor("value", { … }),
  columnHelper.display({ id: "actions", … }),
] satisfies ColumnDef<Company>[];

// 2. Explicit & reliable
const columns: ColumnDef<Company>[] = [
  columnHelper.accessor("firmenname", { … }) as ColumnDef<Company>,
  columnHelper.accessor("value",      { … }) as ColumnDef<Company>,
  columnHelper.display({ … })         as ColumnDef<Company>,
  // cast every column
];

// 3. Quick fallback (loses cell value typing – avoid if possible)
const columns: ColumnDef<Company, unknown>[] = [ … ];
8. General Type & Null Safety Rules

Use ?? for safe defaults (numbers, strings, dates)
Protect nullable fields with:
??, ?., early returns
helpers: formatCurrency, formatDateDistance, safeDisplay

Remove unsafe casts (as string, as any, String(…))
Explicitly type state: useState<string>(""), useState<Record<string, boolean>>({})
tsc --noEmit + next build must pass before commit

9. Clean Code & Verification Rules

Clean code only — no leftovers, no commented-out old code
No reactCompiler: true in next.config.ts (Next 16 enables it automatically)
Every change must preserve:
dark mode
sidebar
theme persistence

Before finishing any task verify:
No font errors
No hook errors
globals.css is clean
All interactive files have "use client"
Dev server runs without warnings


When the user says "follow standards", "clean up" or "update rules", strictly follow and apply this entire document.
Last updated: 2026-03-20