# Aider Conventions – Aquadock CRM v5

Always strictly follow the detailed project rules in **AIDER-RULES.md** and the Supabase schema in **SUPABASE_SCHEMA.md**.

### Core Editing Rules (Strict)
- Only edit the files and sections explicitly requested by the user.
- Never reformat, rename variables, change import order, touch unrelated code, or apply stylistic changes unless specifically asked.
- Preserve existing component structure, Tailwind classes, and styling exactly.
- Use **only safe Biome fixes** — never introduce new lint warnings.
- Never touch the protected Supabase client/server files listed in AIDER-RULES.md.

### Quality Gate (Non-Negotiable)
- Every single change **must** result in **zero errors or warnings** from:
  - `pnpm check:fix` (Biome)
  - `pnpm typecheck` (tsc --noEmit)
- If a change would break the quality gate → do not make it. Ask for clarification instead.
- Prefer the smallest safe change that fulfills the request.

When the user says “follow standards”, “clean up”, “respect rules”, “make it pass typecheck”, or similar → apply **AIDER-RULES.md** with maximum strictness, including the Edit Form Pattern and null-safety rules.