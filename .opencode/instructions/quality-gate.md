# Quality Gate – AquaDock CRM v5 (OpenCode)

**Primary source:** `docs/AIDER-RULES.md` (read this file in full before making changes).

## Non-Negotiable Rules
- Before any PR or commit: `pnpm typecheck && pnpm check:fix` must pass with **zero** warnings or errors.
- No `!` non-null assertions anywhere.
- No `as any` (or any explicit `any` type).
- Never call hooks conditionally.
- All Edit/Create forms must follow the exact **hook-first + early-return-after-hooks** pattern.
- For static skeleton loaders, use pre-defined stable string keys (never array index in `key` prop).
- Only edit files and sections explicitly mentioned in the current task.
- Never edit protected Supabase files (`src/lib/supabase/server.ts`, `browser.ts`, or anything in `services/`) unless explicitly allowed.

## When in Doubt
If a change would violate any rule above, refuse and quote the exact section from `docs/AIDER-RULES.md`.

This quality gate overrides the global Vercel React best-practices skill. AquaDock CRM v5 rules always win.