# AIDER RULES – AQUADOCK CRM v5 (March 2026 – Final Stable + Hardened)

You are **strictly bound** by these rules on every single change.  
They protect the core architecture, prevent recurring type/Biome/React issues, and ensure long-term maintainability.

### 1. Core Stack (Locked – Never Change)

- Next.js 16+ (App Router)
- React 19+
- Tailwind CSS **exactly 4.2.2** (config-less with `@import "tailwindcss";`)
- shadcn/ui (radix-nova style)
- Biome 2.4.8+ for linting and formatting
- pnpm

### 2. Edit Form & Modal Pattern (STRICT RULE – Highest Priority)

All `*EditForm`, `*CreateForm`, and similar components **MUST** follow this exact pattern:

1. **ALL hooks first** — `useQueryClient`, `useMutation`, `useForm`, `useState`, `useEffect`, `useCallback`, `useMemo`, etc. must be at the **absolute top** of the component, before any early returns or logic.
2. **Early return for null/undefined** comes **AFTER** all hooks.
3. Never call hooks conditionally or after an early return.
4. Prop type must allow null: `xxx: Database["public"]["Tables"]["xxx"]["Row"] | null`
5. Use safe optional chaining `xxx?.field` and fallbacks (`??`, `||`).
6. **Never** use `!` non-null assertion anywhere.
7. All non-submit `<button>` elements must have `type="button"`.

### 3. Biome Best Practices (Enforced on Every Change)

**Hooks Rules**
- All hooks at top level, unconditional.
- Respect `useExhaustiveDependencies` — wrap unstable objects in `useMemo` when needed.

**Null Safety**
- No `!` assertions.
- Prefer `?? ""`, `||`, and optional chaining.

**Button & a11y**
- Non-submit buttons: always `type="button"`.
- Never use `<div role="button">` — use real `<button type="button">`.

**Static Skeletons**
- No `key` prop on root skeleton elements.

### 4. Type Management – Single Source of Truth

- `src/lib/supabase/database.types.ts` is the **only** source of truth (auto-generated).
- Always import from `"@/lib/supabase/database.types"`.
- Use `Database["public"]["Tables"]["table"]["Row"]` for database rows.
- Edit forms state: `| null` + early return after hooks.
- After any type change: always run `pnpm build`.

### 5. Supabase Client Rules (Critical – Protected)

**Never edit these files** unless explicitly instructed:
- `src/lib/supabase/server.ts`
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/database.types.ts`

**Rules:**
- Use `createServerSupabaseClient()` and `createClient()` exclusively.
- No `!` on environment variables.
- Always use the shared `handleSupabaseError` from `./utils`.
- Service role key only in development.
- All data operations must go through `src/lib/supabase/services/*.ts`.
- RLS must be respected.

### 6. Companies Page & Core – Protected

- Central heart of the CRM.
- Extend only via services layer (`src/lib/supabase/services/companies.ts`).
- Never put raw queries in pages/components.
- Use `satisfies ColumnDef<Company>[]` for tables (see react-table-v8-ts-tricks.md).

### 7. General Rules

- No unsafe `!` assertions.
- No commented-out old code.
- When user says “follow standards”, “clean up”, “update rules”, or “improve aider rules” → replace the file with the current version of this document.
- Always verify with `pnpm typecheck` + `pnpm build` (Biome alone is insufficient).

### 8. Biome vs Type Checking (Critical)

- `biome check` = fast linting + partial type inference.
- `pnpm typecheck` (`tsc --noEmit`) and `pnpm build` = full TypeScript compiler (source of truth).
- Always run `pnpm build` after type-related changes.

**Recommended package.json scripts:**
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "check": "biome check",
  "check:fix": "biome check --write",
  "typecheck": "tsc --noEmit --pretty"
}
```

### 9. Supabase Schema & Architecture Reference

- See SUPABASE_SCHEMA.md for current table structure and RLS.
- See architecture.md for data flow and component patterns.
- See react-table-v8-ts-tricks.md for TanStack Table v8 patterns (satisfies preferred).

### 10. Development Dependencies & Tooling

- Vitest config (`vitest.config.ts`) must have `@vitejs/plugin-react` installed as dev dependency.
- If you see "Cannot find module '@vitejs/plugin-react'", run `pnpm add -D @vitejs/plugin-react`.
- Keep dev dependencies clean and only add what is actually needed for testing.

**Last updated**: March 2026 (Hardened Edit Form Pattern, Supabase Client Rules, Type Strategy, Biome vs Build, and Single Source of Truth)

**Enforcement**: These rules take precedence over all other instructions. When in doubt, protect the core, use generated types, and verify with full build.
