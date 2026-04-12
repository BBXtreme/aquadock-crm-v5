---
name: Remove EnrichmentModelMode
overview: Remove legacy EnrichmentModelMode (grok_only, claude_only), merge helpers, and modelMode parameters. Enrichment always uses runtime primary from settings/low-cost plus optional gatewayModelOverride, then secondary fallback on retryable errors.
todos:
  - id: gateway-strip
    content: Remove EnrichmentModelMode, modelMode param, grok_only/claude_only branches, pickGrokOnlyModel from company-enrichment-gateway.ts
    status: completed
  - id: actions-company-contact
    content: Strip merge helpers + modelMode from company-enrichment.ts and contact-enrichment.ts actions
    status: completed
  - id: zod-bulk
    content: Remove modelMode from bulk Zod schemas (company + contact validations)
    status: completed
  - id: callers-tests
    content: Update AIEnrichmentModal, CSVImportDialog, ClientCompaniesPage, validation tests
    status: completed
  - id: quality-gate
    content: pnpm typecheck && pnpm check:fix + targeted vitest
    status: completed
isProject: true
---

# Remove legacy EnrichmentModelMode — execution plan

**Allowed edit set (strict):** only these paths — [`src/lib/ai/company-enrichment-gateway.ts`](src/lib/ai/company-enrichment-gateway.ts), [`src/lib/actions/company-enrichment.ts`](src/lib/actions/company-enrichment.ts), [`src/lib/actions/contact-enrichment.ts`](src/lib/actions/contact-enrichment.ts), [`src/lib/validations/company-enrichment.ts`](src/lib/validations/company-enrichment.ts), [`src/lib/validations/contact-enrichment.ts`](src/lib/validations/contact-enrichment.ts), [`src/lib/validations/company-enrichment.test.ts`](src/lib/validations/company-enrichment.test.ts), [`src/lib/validations/contact-enrichment.test.ts`](src/lib/validations/contact-enrichment.test.ts), [`src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx), [`src/components/features/companies/CSVImportDialog.tsx`](src/components/features/companies/CSVImportDialog.tsx), [`src/app/(protected)/companies/ClientCompaniesPage.tsx`](src/app/(protected)/companies/ClientCompaniesPage.tsx).

## 1. Every occurrence (symbols to remove)

- **`EnrichmentModelMode`:** exported from [`company-enrichment-gateway.ts`](src/lib/ai/company-enrichment-gateway.ts); imported in [`company-enrichment.ts`](src/lib/actions/company-enrichment.ts) and [`contact-enrichment.ts`](src/lib/actions/contact-enrichment.ts) actions only.
- **`grok_only` / `claude_only`:** gateway branches; Zod `z.enum(["auto", "grok_only"])` on bulk schemas; test fixture `modelMode: "grok_only"` in company enrichment test.
- **Merge helpers (remove entirely):** `enrichmentPreferenceToModelMode`, `mergeModalCompanyEnrichmentModelMode`, `mergeBulkCompanyEnrichmentModelMode` (company); `enrichmentPreferenceToModelMode`, `mergeModalContactEnrichmentModelMode`, `mergeBulkContactEnrichmentModelMode` (contact).
- **`pickGrokOnlyModel`:** only used by `grok_only` branch in gateway — remove with branches.

## 2. Simplified flow after removal

1. `loadEnrichmentRuntimeConfig()` picks **primary** / **secondary** (user policy primary + env-resolved Grok secondary, or low-cost Gemini+Grok pair). Unchanged.
2. **`gatewayModelOverride`** (modal, validated) overrides `primary` / `secondary` when present. Unchanged.
3. **Single path:** `runWithModel(primary)`; on retryable failure and `secondary !== primary`, `runWithModel(secondary)`. Same as previous `"auto"` path. **No** forced-Grok-only or primary-only-without-fallback paths.

Preserves: modal override, low-cost mode, address focus, rate limits, refund semantics.

## 3. Files edited (minimal set)

Same as allowed edit set in frontmatter (10 files).

## 4. Signature / API simplification

- **Gateway:** `runCompanyEnrichmentGeneration` / `runContactEnrichmentGeneration` — remove `modelMode?`; remove `mode` variable and first two `if` blocks; keep try/catch fallback block only.
- **Actions:** `runCompanyEnrichmentForActiveRow` run object drops `modelMode`; `researchCompanyEnrichment` / `researchContactEnrichment` options → `{ gatewayModelOverride?: … }` only; `runContactEnrichmentForActiveRow` drops `modelMode` argument; bulk paths stop merging `modelPreference` / `parsed.data.modelMode`; remove `AiEnrichmentModelPreference` import from both action files.
- **Zod:** `bulkResearch*InputSchema` — only `companyIds` / `contactIds` (+ existing constraints).

## 5. Quality gate

`pnpm typecheck && pnpm check:fix` and `pnpm exec vitest run src/lib/validations/company-enrichment.test.ts src/lib/validations/contact-enrichment.test.ts` — zero warnings/errors.
