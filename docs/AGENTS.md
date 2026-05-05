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

## LSP Servers (Language Server Protocol)

OpenCode supports Language Servers for enhanced code intelligence (autocomplete, diagnostics, go-to-definition, etc.).

### Current Configuration

Both **project** (`opencode.json`) and **global** (`~/.config/opencode/opencode.json`) enable the following LSPs:

- **TypeScript** — Full type checking, imports, refactoring support.
- **Biome** — Real-time linting and formatting diagnostics (via `biome lsp-proxy`).
- **Tailwind CSS** — Class autocomplete and IntelliSense for Tailwind.

This setup mirrors the experience in Cursor while keeping the two tools fully independent.

### Diagnostics Behavior

LSP diagnostics are kept **relatively quiet** by default. The agent can still read errors and warnings when needed, but they do not overwhelm the UI.

### Coexistence with Cursor

The `.cursor/` directory and all Cursor settings remain untouched. OpenCode uses its own LSP configuration and does not interfere with Cursor.

### Adding or Modifying LSPs

Edit the `"lsp"` section in `opencode.json`. Example:

```json
"lsp": {
  "typescript": { "disabled": false },
  "biome": { "command": ["npx", "biome", "lsp-proxy"] },
  "tailwindcss": { "command": ["npx", "tailwindcss-language-server", "--stdio"] }
}
```

Restart OpenCode after changing LSP settings.

## Plugins

OpenCode supports plugins to extend core functionality.

### Currently Enabled Plugins (Global + Project)

- **opencode-vercel** — Vercel deployment awareness, preview URLs, and deployment status.
- **opencode-github** — GitHub integration for PR creation, issue linking, and smart code review workflows.
- **@tarquinen/opencode-dcp** — Dynamic Context Pruning. Automatically removes obsolete tool outputs to keep context manageable (important with multiple MCP servers + skills active).
- **@tarquinen/opencode-dcp** — Dynamic Context Pruning. Automatically removes obsolete tool outputs to keep context manageable (important with multiple MCP servers + skills active).

### Why These Plugins

These plugins were chosen because they provide high professional value for a production CRM without overlapping with existing MCPs or Skills:

- Context pruning (`@tarquinen/opencode-dcp`) prevents token bloat from the rich MCP + instruction setup.

**Note on GitHub and Vercel integration**: As of May 2026, there are no stable published OpenCode plugins for GitHub or Vercel. We are using the `gh_grep` MCP for GitHub code search as a partial alternative. Vercel functionality can be accessed via terminal commands when needed.

### Adding New Plugins

Add package names to the `"plugin"` array in `opencode.json` (both global and project level). Restart OpenCode after changes.