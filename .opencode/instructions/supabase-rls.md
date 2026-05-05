# Supabase + RLS Rules (OpenCode)

**Source:** `.cursor/rules/supabase-remote.mdc` + `docs/AIDER-RULES.md`

## Generated Types
- Always use generated types from `src/types/supabase.ts` (run `pnpm supabase:types` after schema changes).
- Prefer exported types: `Company`, `Contact`, `Reminder`, etc.

## Client vs Server Boundary (Strict)
- **Never** import `src/lib/supabase/server.ts` (or anything using `next/headers`) from a Client Component.
- Client Components: only `createClient()` from `src/lib/supabase/browser.ts`.
- Server-side: always `createServerSupabaseClient()` from `src/lib/supabase/server`.
- Service role key must never be exposed to client bundles.

## Storage
- Public bucket `avatars` for profile pictures.
- One-time SQL in `src/sql/storage-avatars-bucket.sql`.

## MCP Usage (Schema Introspection)
When you need live schema information, use the `supabase` MCP tools (`list_tables`, `describe_table`, `generate_typescript_types`) before making changes.

## RLS
Strictly respect Row Level Security. All queries must be scoped correctly.

See full Supabase schema notes in `docs/SUPABASE_SCHEMA.md`.