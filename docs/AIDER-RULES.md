# Contributor quality gate — AquaDock CRM v5

**Audience:** Everyone who opens a PR: humans and coding agents.  
**Purpose:** Non-negotiable rules so the codebase stays type-safe, consistent, and easy to change.

**Last updated:** April 24, 2026  

For a shorter checklist, see [`aider.conventions.md`](aider.conventions.md). Deeper product and stack context: [`architecture.md`](architecture.md), [`../README.md`](../README.md).

---

## 1. Before you open a PR

Run locally (same bar as CI for the first two lines):

```bash
pnpm typecheck && pnpm check:fix
```

- If you changed **app logic, UI, or tests:** `pnpm test:run` (or `pnpm test:ci` to match CI exactly).  
- If you edited **`src/messages/*.json`:** `pnpm messages:validate`.  
- If you changed the **public DB schema:** `pnpm supabase:types` and commit `src/types/supabase.ts` when the team shares one project.

CI on PRs (see `.github/workflows/ci.yml`): TypeScript, Biome, Vitest with coverage, production `pnpm build`, Playwright E2E (needs Actions variables; optional login secrets). **Node 24** (LTS), **pnpm 10+** — match your machine (`.nvmrc`, `package.json` `engines`).

---

## 2. TypeScript and style

- **No non-null assertion (`!`).** Use narrowing, optional chaining, or explicit guards.  
- **No `as any`.** If you are stuck, fix the type at the source (schema, `z.infer`, or a small safe helper).  
- **Biome** is the only formatter and linter: `pnpm check` / `pnpm check:fix`. Do not add ESLint or Prettier for this repo.  
- Prefer **small, focused** components and **hook-first** UI patterns; avoid boolean-prop sprawl (see [Vercel composition patterns](../.agents/skills/vercel-composition-patterns/AGENTS.md) if you refactor large components).

---

## 3. Data and validation

- **Zod** schemas in `src/lib/validations/` are the **single source of truth** for shapes sent to the server. Use `.strict()`, sensible `.trim()` / `emptyStringToNull`, and enums aligned with `src/types/supabase.ts`.  
- **Server Actions** (`src/lib/actions/`) stay thin: re-parse with Zod, then call `src/lib/services/`.  
- **Route Handlers** (`src/app/api/**/route.ts`): use the same validation rules as the corresponding action where behavior overlaps; see the checklist in [`architecture.md` — *Mutations: Server Actions vs Route Handlers*](architecture.md#mutations-server-actions-vs-route-handlers).  
- **Database access:** RLS-scoped `createServerSupabaseClient()` for normal work; service role only in audited server paths (never in client bundles).

---

## 4. Internationalization

- User-visible strings for supported locales live in `src/messages/` (`de`, `en`, `hr`).  
- Add keys in lockstep; **`pnpm messages:validate`** enforces key parity.

---

## 5. What “done” means

- The diff **solves the task** without unrelated refactors or drive-by renames.  
- **No** committed secrets; **`.env.local`** stays gitignored.  
- New behavior that users rely on has **tests** when the behavior is non-obvious or regression-prone. Use **[`testing-strategy.md`](testing-strategy.md)** to choose **Vitest** (logic, mocked server code) vs **Playwright** (real auth, RLS, critical UI).  
- If you touch **auth, login, or protected routes**, consider running E2E locally after `pnpm build` (`README.md` — Common commands).

---

## 6. Optional references

- [`testing-strategy.md`](testing-strategy.md) — Vitest vs E2E, coverage exclusions, cheat sheet.  
- [`.cursor/rules/architecture.mdc`](../.cursor/rules/architecture.mdc) — short architecture rules for agents.  
- [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) — tables, RLS notes, Storage.  
- [`production-deploy.md`](production-deploy.md) / [`vercel-production.md`](vercel-production.md) — env and go-live.

---

AquaDock CRM v5
