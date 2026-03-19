# AIDER RULES - AQUADOCK CRM v5 (March 2026 Standard)

You are now bound by these rules on **every single change**. Never break them. This matches the architecture of the best Next.js 16 + shadcn + Tailwind v4 dashboard templates.

### 1. Core Stack (Locked)
- Next.js 16+ (latest)
- React 19+
- Tailwind CSS **exactly 4.2.2** (pinned)
- shadcn/ui latest with **radix-nova** style
- TypeScript strict mode
- Geist fonts via official `geist` package

### 2. Tailwind v4 Rules (Never Deviate)
- Pure config-less only
- globals.css may only contain:
  `@import "tailwindcss";`
  `@import "tw-animate-css";`
- No `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`
- No `tailwind.config.js/ts` file ever
- All theming must be in `@theme inline { ... }` with OKLCH colors
- No `@custom-variant dark` (Tailwind v4 handles `.dark` natively)
- Remove any `@import "shadcn/tailwind.css"`

### 3. Architecture Rules (Strict Boundaries)
- Root `layout.tsx` **must** remain a pure Server Component (no hooks, no "use client")
- Use **one single `ClientLayout`** wrapper for all client providers (TooltipProvider, Toaster, theme, auth, etc.)
- Every page or component that uses hooks, state, effects, shadcn UI, or interactivity **must** start with `"use client";`
- Prefer Server Components for data fetching (Supabase queries)

### 4. Font Rules (Geist)
- Install: `pnpm add geist`
- Import exactly like this:
  ```tsx
  import { GeistSans } from 'geist/font/sans';
  import { GeistMono } from 'geist/font/mono';

- Use in <body className={${GeistSans.variable} ${GeistMono.variable} antialiased}>

### 5. shadcn/ui Rules

- Always run npx shadcn@latest add ... --overwrite
- Style = "radix-nova"
- CSS variables = true
- Use cn() from @/lib/utils
- Components in src/components/ui/

### 6. General Rules

- Clean code only — no leftovers, no commented-out old code
- No reactCompiler: true in next.config.ts (Next 16 enables it automatically)
- Every change must preserve dark mode, sidebar, and theme persistence
- Before finishing any task, verify:
  - No font errors
  - No hook errors
  - globals.css is clean
  - All interactive files have "use client"
  - Dev server runs without warnings

When the user says "follow standards" or "clean up", you must strictly follow this entire document.