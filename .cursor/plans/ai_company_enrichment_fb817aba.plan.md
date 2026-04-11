---
name: AI Company Enrichment
overview: Add a server-only Vercel AI Gateway flow (Perplexity web search tool + structured output) that returns Zod-validated, review-only company field suggestions, exposed via a new Server Action and client UI (button + modal with checkboxes and sources) on company detail, full edit form, and optional post–OSM-import deep link.
todos:
  - id: schema-tests
    content: Add src/lib/validations/company-enrichment.ts + company-enrichment.test.ts; export from validations/index.ts
    status: completed
  - id: server-ai
    content: Add src/lib/ai/company-enrichment-gateway.ts + src/lib/actions/company-enrichment.ts (generateText + Output.object + perplexitySearch + stopWhen)
    status: completed
  - id: ui-modal
    content: Add AIEnrichButton + AIEnrichmentModal under src/components/features/companies/ai-enrichment/
    status: completed
  - id: integrate-detail-edit
    content: Wire CompanyHeader, CompanyDetailClient, CompanyEditForm, companies/[id]/page.tsx (searchParams)
    status: completed
  - id: osm-phase2
    content: Update useMapPopupActions import success navigation with ?aiEnrich=1
    status: completed
  - id: i18n-validate
    content: Add de/en/hr message keys; run messages:validate + typecheck + check:fix + tests
    status: completed
isProject: false
---

# AI Company Enrichment (Internet Research Suggestions)

## 200% planning checklist (plan + polish)

1. **Architecture** — Client triggers Server Action `researchCompanyEnrichment`; action resolves company via Supabase + RLS, calls [`src/lib/ai/company-enrichment-gateway.ts`](src/lib/ai/company-enrichment-gateway.ts) (`generateText` + `Output.object` + Perplexity tool), returns sanitized DTO only; no auto-save.
2. **Zod** — [`src/lib/validations/company-enrichment.ts`](src/lib/validations/company-enrichment.ts): `.strict()`, `.trim()`, shared `emptyStringToNull` on nullable strings, optional **`aiSummary`**, per-field confidence + sources; post-validate with `companySchema.shape.*.safeParse`.
3. **Gateway models** — Primary **`anthropic/claude-sonnet-4.6`**; explicit fallback **`xai/grok-4.1-fast-non-reasoning`** on gateway-style failures (see gateway helper).
4. **Perplexity** — `perplexitySearch({ maxResults: 5, searchLanguageFilter: ["de"], searchRecencyFilter: "month" })` (recency bias + German language filter).
5. **UI** — Confidence badges (low / medium / high), sources as `target="_blank"` links, **success toast on apply**, **loading progress** bar while mutation pending; skeleton keys `enrich-skeleton-${i}`.
6. **Edit-form merge** — `useEffect` keyed by **`aiPrefill.version`** (strict hook-first: effect placed **before** any early return); parent clears prefill via `onAiPrefillConsumed`.
7. **Integration** — [`CompanyHeader`](src/components/company-detail/CompanyHeader.tsx), [`CompanyDetailClient`](src/app/(protected)/companies/[id]/CompanyDetailClient.tsx), [`CompanyEditForm`](src/components/features/companies/CompanyEditForm.tsx), [`page.tsx`](src/app/(protected)/companies/[id]/page.tsx) `searchParams`, Phase 2 [`useMapPopupActions`](src/components/features/map/useMapPopupActions.ts) `?aiEnrich=1`.
8. **Quality gate** — `pnpm typecheck && pnpm check:fix` (zero issues), `pnpm test:run`, `pnpm messages:validate`.
9. **Rollout** — Phase 1 (schema, action, gateway, UI, i18n, detail + edit); Phase 2 (OSM import query + auto-open + `router.replace` strip).

## Context corrections

- There is **no** [`src/lib/actions/company.ts`](src/lib/actions/company.ts); add [`src/lib/actions/company-enrichment.ts`](src/lib/actions/company-enrichment.ts) with `"use server"`.
- Forms use **`companySchema`** / **`CompanyForm`** in [`src/lib/validations/company.ts`](src/lib/validations/company.ts).
- Structured output uses **`generateText` + `Output.object()`** (AI SDK v6; Perplexity tool in same call).

## 1) Architecture and exact file list

(Same as v1 plan: new validations, tests, gateway, action, `ai-enrichment/` UI, edits to `validations/index`, company detail page + client, header, edit form, map hook, `de`/`en`/`hr` messages.)

## Polish refinements (locked for implementation)

- **Models:** Claude Sonnet 4.6 primary; Grok 4.1 fast non-reasoning fallback via AI Gateway.
- **Schema:** `emptyStringToNull` on applicable strings; optional **`aiSummary`** (trim + max length).
- **UI:** Confidence badges, external source links, apply success toast, determinate/indeterminate loading progress during research.
- **Perplexity:** `searchLanguageFilter: ["de"]`, `searchRecencyFilter: "month"`.
- **Hooks:** Versioned `aiPrefill` merge in `CompanyEditForm`; all hooks before early return.

## Optional

- [`src/lib/actions/index.ts`](src/lib/actions/index.ts) barrel export — omitted unless needed.

## Implementation execution note

Implement in rollout order; after approval run `pnpm typecheck && pnpm check:fix` and tests; end with the agreed completion line.
