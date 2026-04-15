# AquaDock CRM v5 – Cursor / Vercel Agent Rules (April 2026)

**Highest Priority – These rules override everything else, including the Vercel React best-practices skill.**

You are working on AquaDock CRM v5. Follow these rules **exactly** on every suggestion and every code change.

## ZERO-TOLERANCE QUALITY GATE (Never Violate)
On EVERY change you propose:
- The code MUST pass `pnpm typecheck && pnpm check:fix` with **zero** warnings or errors.
- Never introduce Biome lint issues (no `noExplicitAny`, no `useExhaustiveDependencies`, no formatting violations, etc.).
- Never introduce TypeScript errors.
- Never use `!` non-null assertions.
- Never use `as any` (or any explicit `any` type).
- Never call hooks conditionally.
- All Edit/Create forms must follow the exact **hook-first + early-return-after-hooks** pattern.
- For all static skeleton loaders, use pre-defined stable string keys (e.g. `loading-item-1`). Never use array index in `key` prop.

If you are unsure whether a change will pass the quality gate → do not suggest it. Ask for clarification instead.

## Core Stack (Locked – Never Change)
- Next.js 16.2+ (App Router)
- React 19.2+
- Tailwind CSS exactly 4.2.2 (config-less with `@import "tailwindcss";`)
- shadcn/ui (radix-nova style)
- Biome 2.4.9+ for linting and formatting
- pnpm

## Zod + Supabase Validation Rules
- Zod schemas in `src/lib/validations/` are the single source of truth.
- Every schema must use `.strict()`.
- All string fields: use `.trim()` on user input.
- For nullable Supabase columns: always use `.nullable().optional()` + convert empty string to `null` with `emptyStringToNull` helper.
- Use `z.string().uuid()` for all ID fields.
- Use `z.enum([...])` from `src/lib/constants/company-options.ts`.
- After schema: always export `export type CompanyForm = z.infer<typeof companyFormSchema>;` (and equivalent for others).
- Mapping helpers (`toCompanyInsert`, etc.) must use safe transforms.

## React Hook Form + shadcn/ui (Critical)
- Never use `control={form.control as any}`.
- Correct pattern only:
  ```ts
  import { Control } from "react-hook-form";
  import type { CompanyForm } from "@/lib/validations/company";
  
  const form = useForm<CompanyForm>({ resolver: zodResolver(companyFormSchema) });
  
  <FormField
    control={form.control as Control<CompanyForm>}
    name="..."
    render={({ field }) => ...}
  />

## Server vs Client Boundary (Critical)

- NEVER import src/lib/supabase/server.ts (or anything using next/headers, cookies(), headers()) from a Client Component ("use client").
- Client Components may only use createClient() from src/lib/supabase/browser.ts.
- If a service is needed on both sides, split it or keep server-only logic in Server Actions / Server Components.

## Editing Discipline

- Only edit files and sections explicitly mentioned in the current user task.
- Never reformat, rename variables, change import order, or touch unrelated code.
- Never edit protected Supabase files (src/lib/supabase/server.ts, browser.ts, or any file in services/ unless explicitly allowed).

## Architecture & Schema Alignment

- Follow architecture.md, SUPABASE_SCHEMA.md (last audited 2026-04-12), and react-table-v8-ts-tricks.mdexactly.
- Use TanStack Table v8 with satisfies ColumnDef<YourRowType>[] (preferred) or explicit cast (see react-table-v8-ts-tricks.md).
- Use safeDisplay from @/lib/utils/data-format.ts for nullable fields in UI.

## Vercel React Best-Practices Skill

The global Vercel skill is installed. You may use its suggestions **only** when they do not violate any rule above. When in conflict, AquaDock CRM v5 rules always win.

Built with ❤️ at Waterfront Beach • 2026