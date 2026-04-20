---
name: semantic_sdk_settings_refactor
overview: Migrate company semantic embeddings from direct xAI HTTP calls to Vercel AI SDK with OpenAI defaults, and add a new Semantic Search settings section stored in `user_settings`, while preserving current hybrid + lexical-fallback behavior.
todos:
  - id: refactor-embedding-sdk
    content: Refactor semantic embedding generation to Vercel AI SDK in semantic-search service with settings/env defaults
    status: pending
  - id: wire-query-gating
    content: Apply semantic_search_enabled and new embedding helper in companies list query applier while preserving lexical fallback
    status: pending
  - id: add-semantic-settings-ui
    content: Add Semantic Search & Embeddings settings card and EAV persistence in settings page/actions/services
    status: pending
  - id: badge-toggle-plumbing
    content: Wire show_semantic_badge setting from companies page to CompaniesTable display prop
    status: pending
  - id: deps-and-i18n
    content: Add @ai-sdk/openai and translation keys in en/de/hr for new settings section
    status: pending
  - id: tests-and-verify
    content: Update tests and run typecheck/check/vitest to validate unchanged behavior guarantees
    status: pending
isProject: false
---

# Semantic Search SDK + Settings Plan

## Why Vercel AI SDK is the right choice now
- Replace fragile provider-specific HTTP handling with a stable `embed()` abstraction (`ai` SDK) and provider adapters.
- Keep your current 1536-dimension contract by defaulting to OpenAI `text-embedding-3-small`, which fits existing `vector(1536)` schema and RPC flow.
- Maintain future provider flexibility (`EMBEDDING_PROVIDER` + UI setting) without changing search/query plumbing again.
- Remove xAI model entitlement risk from the critical path while still leaving room for xAI as a future selectable option.

## Confirmed behavior constraints (kept unchanged)
- Lexical fallback remains in place in list filtering: if embedding/hybrid fails, query falls back to current `ilike` path.
- Hybrid RPC + RRF ranking stays unchanged (`hybrid_company_search`, rank fusion logic untouched).
- Embedding writes for create/update/import remain non-blocking best effort (`void` + internal warn/no throw).
- Existing companies search UI styling/UX remains untouched; only badge visibility will become settings-driven.

## Implementation scope and exact file changes

### 1) Core embedding provider refactor
- Update [`src/lib/services/semantic-search.ts`](src/lib/services/semantic-search.ts)
  - Swap direct xAI `fetch` implementation for Vercel AI SDK `embed`.
  - Add provider/model resolution logic with defaults:
    - provider default: `openai`
    - model default: `text-embedding-3-small`
  - Keep existing exported document builder and hybrid RPC functions intact.
  - Add settings-aware embedding config lookup from `user_settings` when a signed-in user context is available; otherwise fall back to env defaults.
  - Respect `auto_backfill_embeddings` during create/update/import embedding writes.
  - Keep strict dimension validation at 1536 before DB/RPC usage.

### 2) Query applier wiring
- Update [`src/lib/companies/companies-list-supabase.ts`](src/lib/companies/companies-list-supabase.ts)
  - Replace old `createXaiEmbedding` usage with the new provider-agnostic embedding function.
  - Keep existing fallback semantics and query composition exactly as-is.
  - If `semantic_search_enabled` is false for the active user, bypass embedding/hybrid path and use lexical path immediately.

### 3) Settings UI section (new card)
- Extend [`src/app/(protected)/settings/ClientSettingsPage.tsx`](src/app/(protected)/settings/ClientSettingsPage.tsx)
  - Add a new “Semantic Search & Embeddings” settings card using existing settings page patterns (`Card`, `Switch`, `Select`, `useQuery`, `useMutation`, `upsert user_settings`).
  - Persist keys in `user_settings`:
    - `embedding_provider`
    - `embedding_model`
    - `semantic_search_enabled`
    - `auto_backfill_embeddings`
    - `show_semantic_badge`
  - Defaults in UI when rows are missing:
    - provider: `openai`
    - model: `text-embedding-3-small`
    - semantic enabled: `true`
    - auto backfill: `true`
    - show badge: `true`

### 4) Search badge visibility toggle
- Update [`src/components/tables/CompaniesTable.tsx`](src/components/tables/CompaniesTable.tsx)
  - Read/passthrough one boolean prop controlling semantic badge visibility.
  - Keep search behavior/layout unchanged when enabled.
- Update [`src/app/(protected)/companies/ClientCompaniesPage.tsx`](src/app/(protected)/companies/ClientCompaniesPage.tsx)
  - Fetch/use `show_semantic_badge` setting for current user and pass it to `CompaniesTable`.
  - Do not alter debounce, query key behavior, or smooth table-only update logic.

### 5) Backfill behavior integration in company actions
- Minimal adjustment in [`src/lib/actions/companies.ts`](src/lib/actions/companies.ts)
  - Keep current call sites and non-blocking pattern.
  - Ensure the embedding helper enforces `auto_backfill_embeddings` with fallback default `true` when no user setting is resolvable.

### 6) Existing settings infrastructure extension
- Update [`src/lib/actions/settings.ts`](src/lib/actions/settings.ts)
  - Add typed server-action helpers for semantic settings snapshot + update (similar to existing AI enrichment settings patterns).
- Update [`src/lib/services/user-settings.ts`](src/lib/services/user-settings.ts)
  - Add reusable semantic settings load/parse helpers (string/boolean coercion + defaults).

### 7) Support-file updates (approved)
- Update [`package.json`](package.json)
  - Add `@ai-sdk/openai` dependency.
- Update i18n messages:
  - [`src/messages/en.json`](src/messages/en.json)
  - [`src/messages/de.json`](src/messages/de.json)
  - [`src/messages/hr.json`](src/messages/hr.json)
  - Add labels/help text/toasts for the new Semantic Search settings section.

### 8) Test updates and verification
- Update/add tests for refactor impact:
  - [`src/lib/services/semantic-search.test.ts`](src/lib/services/semantic-search.test.ts)
  - [`src/lib/companies/companies-list-supabase.test.ts`](src/lib/companies/companies-list-supabase.test.ts)
  - settings action/service tests as needed for new keys
- Run verification:
  - `pnpm typecheck`
  - `pnpm check`
  - targeted vitest runs for touched modules

## Critical design decision incorporated from your answers
- **Hybrid setting scope** selected:
  - Per-user settings apply to UI and live search behavior.
  - Create/update/import backfill path uses global defaults when user-specific context is unavailable, preserving reliable non-blocking writes.

## Notes on non-goals for this change
- No change to SQL schema/RPC shape.
- No visual redesign of the companies search field.
- No destructive migration or data rewrite in this step.
