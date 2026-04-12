---
name: AI Enrichment Modal Header
overview: Ultra-compact modal header (~140px), ghost usage pill, single Switch (Model-Only default vs Full web search), model Select only in Model-Only; mutation sends override only in model-only; Full Perplexity uses persisted tuning from policy (same EAV keys as Schnelllauf) without editing policy.ts.
todos:
  - id: modal-header-layout
    content: Refactor AIEnrichmentModal header per spec; remove tri-mode + Vercel credits from header
    status: completed
  - id: gateway-full-perplexity
    content: Gateway full path use runtime perplexityFastMaxResults + perplexityFastRecency + crmSearchLocale
    status: completed
  - id: company-enrichment-prompt
    content: Align userPromptFull text with dynamic max/recency from run
    status: completed
  - id: i18n-minimal
    content: de/en/hr shorten modal copy; add usagePill + webSearchActive + modelOnlyStatusLine
    status: completed
  - id: quality-gate
    content: pnpm typecheck && pnpm check:fix
    status: completed
isProject: false
---

# Plan (execution): AI enrichment modal header

## 1. New header JSX structure (compact classes)

**Wrapper:** `div.shrink-0.border-b...` with `max-h-[min(140px,24dvh)] sm:max-h-[min(128px,20dvh)]`, `overflow-y-auto`, horizontal padding aligned with body (`px-5 sm:px-7`), **reduced top padding** (`pt-9 sm:pt-10`) and small `pb-2` to stay under ~140px.

**Row 1 — `flex items-center justify-between gap-2`:**

- `DialogHeader` minimal: `DialogTitle` `text-xs font-semibold sm:text-sm leading-tight` (short i18n).
- Right: when `usageQuery.data` → `Badge variant="outline"` ghost pill: `text-muted-foreground/80 text-[10px] tabular-nums border-border/60 bg-muted/20` + `t("aiEnrich.usagePill", { used, limit })` (e.g. `33/37`). While loading → tiny `Skeleton` pill.

**Row 2 — `mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3`:**

- `div.flex items-center gap-2`: `Switch` `id="ai-enrich-web-search"` + `Label htmlFor` → `t("aiEnrich.webSearchCurrentLabel")`. `checked={enrichmentWebMode === "full"}`; `onCheckedChange`: if `checked` set mode `full` else `model-only`; when turning **on** full, reset model override to default + ref; `enrichmentWebModeRef.current = ...`; `startEnrichmentRun()`.
- **Optional** `flex-1 min-w-0`: Model `Select` **only if** `enrichmentWebMode === "model-only"` (same `Select`/`SelectTrigger` as today, no extra label paragraphs).

**Row 3 — at most one status line:** `p` `text-[9px] text-muted-foreground line-clamp-2`: if model-only → `t("aiEnrich.modelOnlyStatusLine")` (wraps tiny warning); if full → `t("aiEnrich.webSearchActive")`.

**Removed from header:** tri-mode `Button` fieldset, `Progress` for usage, Vercel credits block, `fastPerplexityNote`, model override help paragraphs, visible `DialogDescription` (keep `className="sr-only"` + short `modalDescription`).

**Unchanged below header:** error banner, skeleton, table, footer, `activeRunGenerationRef` / `mutate` / `onSuccess` guards.

## 2. State and refs

- Default `useState<CompanyEnrichmentWebSearchMode>("model-only")`; `enrichmentWebModeRef` initial `"model-only"`.
- On dialog close (`!open`): reset `enrichmentWebMode` + ref to `"model-only"`, `modelOverridePick` default, `enrichmentWebModeRef` / `modelOverrideRef` synced.
- **Switch state** is derived: `checked={enrichmentWebMode === "full"}` — no duplicate `webSearchOn` state (avoids drift); ref `enrichmentWebModeRef` remains the mutation source of truth.

## 3. Mutation call

```ts
const mode = enrichmentWebModeRef.current;
const primary = modelOverrideRef.current;
const res = await researchCompanyEnrichment(company.id, {
  webSearchMode: mode,
  gatewayModelOverride:
    mode === "model-only" && primary !== null ? { primary } : undefined,
});
```

## 4. Gateway (`company-enrichment-gateway.ts`)

- For `webSearchMode === "full"` (non-fast, non-model-only): build `perplexityProfile` with `maxResults: runtime.perplexityFastMaxResults`, `searchRecencyFilter: runtime.perplexityFastRecency`, `searchLanguageFilter: [runtime.crmSearchLocale]` (language already policy; max/recency now match persisted user settings loaded via existing `fetchAiEnrichmentPolicy` in `loadEnrichmentRuntimeConfig`).
- **Comment** update at top of file: modal uses model-only + full only; fast remains for API/bulk compatibility.

## 5. Actions (`company-enrichment.ts`)

- `userPromptFull`: replace hardcoded “5 Treffer / month” with interpolated `run.perplexityFastMaxResults`, `run.perplexityFastRecency`, and `searchLanguageLine` (same pattern as fast).

## 6. i18n (de / en / hr)

- Shorten `modalTitle`, `modalDescription` (sr-only).
- Add: `usagePill`, `webSearchActive`, `modelOnlyStatusLine` (single short line for model-only + warning).
- Leave legacy keys (`webModeFast`, etc.) in JSON if still referenced elsewhere; grep before removal.

## 7. Quality gate

`pnpm typecheck && pnpm check:fix`
