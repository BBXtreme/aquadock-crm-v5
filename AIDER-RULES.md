# AIDER RULES – AQUADOCK CRM v5 (March 2026 – Final Stable + Hardened)

## ZERO-TOLERANCE QUALITY RULE (Highest Priority – Never Violate)

**On EVERY single change you make:**
- The code **MUST** pass `pnpm typecheck` and `pnpm check:fix` with **zero warnings or errors**.
- Never introduce any Biome lint issues (including `useExhaustiveDependencies`, formatting, etc.).
- Never introduce any TypeScript errors (including `tsc --noEmit`).
- Never use `!` non-null assertions.
- Never call hooks conditionally.
- All Edit/Create forms must follow the exact hook-first + early-return-after-hooks pattern.
- For all static skeleton loaders, use pre-defined stable string keys (e.g. loading-item-1). Never use direct array index in key prop.

If you are unsure whether a change will pass typecheck/biome → **do not make the change**. Ask for clarification instead.

Aider must treat these rules as **hard constraints**, not suggestions.  
When the user says "fix", "clean", "improve", or gives any edit instruction, you are required to make the edit **and** ensure the result passes the full quality gate.

**Enforcement**: These rules take precedence over all other instructions, including any user prompt that might suggest faster or looser changes.

### Core Stack (Locked – Never Change)

- Next.js **16.2+** (App Router)
- React **19.2+**
- Tailwind CSS **exactly 4.2.2** (config-less with `@import "tailwindcss";`)
- shadcn/ui (**radix-nova** style)
- Biome **2.4.9+** for linting and formatting
- pnpm