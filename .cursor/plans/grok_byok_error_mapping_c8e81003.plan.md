---
name: Grok BYOK error mapping
overview: Fix quota-vs-credits misclassification in server actions by prioritizing Vercel AI Gateway billing signals (especially HTTP 402) over loose "grok/xai" substring heuristics; return optional structured diagnostics for the company modal to show a safe debug banner and optional token hints parsed from gateway text. Mirror the same mapping in contact enrichment for parity.
todos:
  - id: map-quota-company
    content: "Refactor company-enrichment.ts: mapProviderQuotaExhaustionCode + GatewayError 402/credits path; add AiEnrichmentFailureDiagnostic + populate on catch; extend ok:false response type"
    status: completed
  - id: map-quota-contact
    content: Mirror same mapping + diagnostic typing/return in contact-enrichment.ts (import diagnostic type from company-enrichment if clean)
    status: completed
  - id: modal-banner
    content: "AIEnrichmentModal: throw rich client error with diagnostic; state for detail banner; link + token hint display; clear state with existing reset paths"
    status: completed
  - id: quality-gate
    content: Run pnpm typecheck && pnpm check:fix; fix any test/mock typing
    status: completed
isProject: false
---

# Fix Grok BYOK / Vercel credits error mapping + modal diagnostics

## 1. Files to create or edit

| Action | File |
|--------|------|
| Edit | [`src/lib/actions/company-enrichment.ts`](src/lib/actions/company-enrichment.ts) |
| Edit | [`src/lib/actions/contact-enrichment.ts`](src/lib/actions/contact-enrichment.ts) |
| Edit | [`src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx) |

No other files (per your constraint). **Note:** true success-path token totals from `generateText` live in [`src/lib/ai/company-enrichment-gateway.ts`](src/lib/ai/company-enrichment-gateway.ts), which is out of scope here; the plan only adds **optional hints parsed from gateway error text** when present.

## 2. Error mapping: distinguish Vercel credit block vs xAI quota

**Root cause (current):** [`mapProviderQuotaExhaustionCode`](src/lib/actions/company-enrichment.ts) uses `modelMode === "grok_only"` **or** `/grok|xai|x\.ai/.test(diagnosticText)` to choose `XAI_GROK_QUOTA_EXHAUSTED`. Vercel-side failures often mention the routed model (`xai/grok-…`), so credit exhaustion is mislabeled as xAI quota—especially in Grok-only / BYOK flows.

**Approach (both company + contact files, keep logic in sync):**

- Add a small **normalization** step on the diagnostic string before heuristics: strip common **gateway model id** tokens (e.g. `xai/grok-…`, `anthropic/claude-…`) so provider slugs do not falsely satisfy “xAI context”.
- Add **explicit Vercel / AI Gateway account billing** detectors (substring heuristics on normalized text), e.g. `vercel`, `ai gateway`, `gateway credits`, `spend limit`, `insufficient … credits`, `billing`, patterns aligned with how the gateway describes **account** credit exhaustion (tune against real messages you see; keep conservative).
- Add **explicit upstream xAI** detectors that require stronger signals than a bare `grok` in a model id, e.g. `api.x.ai`, `x.ai` as host, `consumer` + `quota`, `from provider` + `xai`, etc.
- **Fast-path:** when `GatewayError.isInstance(err)` and `err.statusCode === 402`, map to **`VERCEL_AI_GATEWAY_CREDITS_EXHAUSTED`** unless the message clearly matches the upstream-xAI detector (rare). This directly targets “Vercel credits = 0” mislabeled as Grok quota.
- Remove the unconditional `modelMode === "grok_only"` branch that forces xAI quota; Grok-only runs still hit the gateway first—**billing classification should be message-driven**, with **402 / Vercel-first** defaults.

Refactor `mapCompanyEnrichmentPipelineError` / `mapContactEnrichmentPipelineError` so the “credits vs quota” branch calls a single internal helper (within each file) that receives **`statusCode` + combined message** (not only `modelMode`).

**Preserve behavior:** all existing stable codes (`AI_GATEWAY_RATE_LIMIT`, `AI_GATEWAY_UNAVAILABLE`, `AI_ENRICHMENT_RATE_LIMIT:…`, `ENRICHMENT_FAILED`, etc.) stay unchanged unless this logic intentionally narrows the mis-routed subset.

## 3. Raw diagnostics + suggestions + token hint (modal + action contract)

**Server actions**

- Extend failure union (company + contact) with an **optional** field, e.g. `diagnostic?: AiEnrichmentFailureDiagnostic`, where `ResearchCompanyEnrichmentResponse` / `ResearchContactEnrichmentResponse` `ok: false` branch includes it. Existing callers that only read `error: string` remain valid.
- Define `AiEnrichmentFailureDiagnostic` in [`company-enrichment.ts`](src/lib/actions/company-enrichment.ts) and **re-use the same shape** in contact (duplicate type or `import type` from company—prefer `import type` if it does not create a circular dependency; today [`contact-enrichment.ts`](src/lib/actions/contact-enrichment.ts) does not import company, so `import type { AiEnrichmentFailureDiagnostic } from "@/lib/actions/company-enrichment"` is acceptable).
- Populate diagnostic only on pipeline failures (the `catch` in `runCompanyEnrichmentForActiveRow` / `runContactEnrichmentForActiveRow`), with **safe, bounded** fields, for example:
  - `stableCode`: same string as `error` (redundant but convenient for UI)
  - `httpStatus?: number` from `GatewayError.statusCode` when applicable
  - `gatewayMessage`: truncated plain `GatewayError.message` (e.g. max 500 chars), no stack traces
  - `generationId?: string` if present on the error
  - `tokenUsageHint?: string`: optional substring extracted via regex from `gatewayMessage` when phrases like `prompt_tokens`, `completion_tokens`, `total_tokens`, or `input_tokens` / `output_tokens` appear (best-effort; often absent)

**Modal ([`AIEnrichmentModal.tsx`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx))**

- Introduce a small **client error** (subclass of `Error` or `{ name, message, diagnostic }`) thrown from `mutationFn` when `!res.ok`, carrying `res.diagnostic` so `onError` can read it (same JS realm—no RSC serialization issue).
- Add React state alongside `enrichmentInlineError`, e.g. `enrichmentFailureDetail`, cleared whenever the inline error is cleared (dialog close / retry / success).
- **Banner UX:** keep the primary line as today’s `resolveCompanyAiEnrichmentErrorMessage` (i18n). Below it, a compact **debug panel** (muted text, `text-xs`, monospace for raw message) showing:
  - stable code (from `res.error` / diagnostic)
  - HTTP status when known
  - truncated gateway message
- **Suggestion row (no new i18n files):** when `error === "VERCEL_AI_GATEWAY_CREDITS_EXHAUSTED"`, reuse existing copy + affordances: `t("aiEnrich.errorVercelGatewayCredits")` is already the headline; add a short English **debug-oriented** second line only in the detail panel, e.g. “Add Vercel AI Gateway credits or top up in the dashboard”, plus the existing [`VERCEL_AI_GATEWAY_DASHBOARD_HREF`](src/lib/constants/vercel-ai-gateway.ts) link using `t("aiEnrich.vercelAiGatewayDashboardLink")` (already in modal for credits). This respects “existing keys where possible” while staying within the three-file edit list.
- When `tokenUsageHint` is set, show it under the debug block as optional English technical text (debug audience).

**Toast:** keep a single user-facing toast string (i18n); optional: omit raw gateway text from toast to avoid noise.

## 4. Quality gate

After implementation: `pnpm typecheck && pnpm check:fix` with zero warnings/errors.

**Tests:** [`src/app/(protected)/companies/[id]/__tests__/company-detail-refresh.test.tsx`](src/app/(protected)/companies/[id]/__tests__/company-detail-refresh.test.tsx) mocks `researchCompanyEnrichment` with `{ ok: true, … }` only—likely unchanged. If any mock expects the exact failure union shape, update minimally.

## 5. Constraint note (i18n)

You asked for minimal new i18n keys but also **only** three files. This plan **does not edit** `src/messages/*.json`; supplementary debug copy uses existing keys for the main message + dashboard link, with brief English lines only in the technical detail strip. If you later want full DE/HR coverage for debug strings, add keys in messages (outside this three-file scope).
