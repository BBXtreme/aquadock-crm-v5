# AquaDock CRM v5 – OpenCode Agent Instructions

**Primary rules:** Follow `docs/AIDER-RULES.md` on every change.

This project uses OpenCode with project-level configuration in `opencode.json`.

## Key OpenCode Files
- `.opencode/instructions/` – adapted architecture, Zod, Supabase, and quality-gate rules (reference the Cursor `.cursor/rules/` originals)
- `.opencode/agents/strict-reviewer.md` – custom strict reviewer agent that enforces the zero-tolerance quality gate
- `opencode.json` – MCP servers (Context7, GitHub Grep, Supabase), agent definitions, instructions, permissions

## How to Use
- Normal work: use the default `build` agent.
- Strict review: switch to or call the `strict-reviewer` agent (Tab to change mode or prefix prompts with “use strict-reviewer”).
- MCP tools: Context7 for docs, gh_grep for GitHub code search, supabase for live schema introspection.
- Quality gate: every edit must pass `pnpm typecheck && pnpm check:fix` with zero warnings.

The `.cursor/` directory is kept for coexistence with Cursor. OpenCode ignores it and uses its own config.

See `opencode.json` and the files in `.opencode/` for full configuration.

## Skills (Agent Skills)

OpenCode loads specialized skills from the paths declared in `opencode.json` under `"skills.paths"`.

### Current Setup
- **Global skills** (available in every project): `~/.config/opencode/skills/`
  - Symlinked from this repo’s `.agents/skills/` for single source of truth.
  - Currently contains: `vercel-composition-patterns` and `find-skills`.
- **Project skills**: `.opencode/skills/` (and `.agents/skills/` for backward compatibility).
- Both locations are listed in the project `opencode.json`.

### Strict-Reviewer Agent
The `strict-reviewer` agent remains focused exclusively on the zero-tolerance quality gate (`!`, `as any`, `pnpm typecheck && pnpm check:fix`).
Composition patterns and other skill rules are passively available to the default `build` agent via the skill system. This keeps reviews sharp and decisive.

### How to Add a New Skill

**Globally (recommended for reusable skills):**
1. Install the skill (e.g. `npx skills add owner/repo@skill-name -g -y`).
2. The skill will appear in `~/.config/opencode/skills/`.
3. (Optional) Create a symlink from this repo’s `.agents/skills/` so it travels with the project.

**Per-project only:**
1. Place the skill folder in `.opencode/skills/` (or `.agents/skills/`).
2. It will only be active when this project is open.

**Symlink strategy**
All global skills are symlinked from `.agents/skills/` into `~/.config/opencode/skills/`. This keeps the canonical source in the repo while making them available everywhere.

The `find-skills` meta-skill is included globally so you can discover and install additional skills on demand without leaving the agent.