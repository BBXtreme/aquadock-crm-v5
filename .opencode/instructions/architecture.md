# AquaDock CRM v5 – Architecture & Core Rules (OpenCode)

**Source of truth:** `docs/AIDER-RULES.md` + original `.cursor/rules/*.mdc`

## Core Principles (Always Apply)
- Next.js 16.2+ App Router + React 19.2+
- Server Components by default for data fetching and Supabase queries
- All forms: Zod schemas from `src/lib/validations/` (single source of truth, no DTOs)
- Every form uses React Hook Form + `zodResolver` + shadcn/ui
- Use `Control<T>` (never `as any`)
- Hook-first + early-return-after-hooks pattern on every form
- **ZERO TOLERANCE:** No `!` non-null assertions, no `as any`, no explicit `any`
- Biome only (never ESLint/Prettier)
- All DB operations through service layer or Server Actions
- Zod: `.strict()`, `emptyStringToNull` for nullable fields, align with `supabase.ts` types
- Tests: Vitest for logic, Playwright for auth/RLS/critical UI

**Quality Gate:** Every change must pass `pnpm typecheck && pnpm check:fix` with zero warnings before committing.

See full details in `docs/AIDER-RULES.md`.