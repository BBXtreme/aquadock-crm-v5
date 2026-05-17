# OpenCode Skills – AquaDock CRM v5

This directory contains project-specific agent skills.

## Current Skills

- Skills are primarily loaded globally from `~/.config/opencode/skills/` (symlinked from `.agents/skills/`).
- This directory exists for future project-only skills that should not be shared across all repositories.

## Adding Skills

See the root `AGENTS.md` → “How to Add a New Skill” section for the recommended global vs per-project workflow.

All global skills use symlinks so there is a single source of truth in `.agents/skills/`.