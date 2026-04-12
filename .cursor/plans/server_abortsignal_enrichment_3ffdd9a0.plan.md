---
name: Server AbortSignal enrichment
overview: Optional AbortSignal flows modal → researchCompanyEnrichment → runCompanyEnrichmentForActiveRow → runCompanyEnrichmentGeneration; gateway passes abortSignal to all company generateText calls; abort-like errors return ENRICHMENT_ABORTED with slot refund; modal passes signal and treats ENRICHMENT_ABORTED as silent cancel (no toast, no error banner).
todos:
  - id: gateway-signal
    content: Add optional signal to runCompanyEnrichmentGeneration + model-only helper; pass abortSignal to all company generateText calls
    status: completed
  - id: action-signal-abort
    content: Add signal to runCompanyEnrichmentForActiveRow + researchCompanyEnrichment; abort-like -> ENRICHMENT_ABORTED; inner catch refund + ENRICHMENT_ABORTED vs ENRICHMENT_FAILED
    status: completed
  - id: modal-pass-silent
    content: Pass signal to researchCompanyEnrichment; silent cancel for AbortError + ENRICHMENT_ABORTED (no toast/banner)
    status: completed
isProject: false
---

# Server-side AbortSignal for company AI enrichment (refined)

## Numbered plan (implement exactly)

1. **`runCompanyEnrichmentGeneration`** ([`src/lib/ai/company-enrichment-gateway.ts`](src/lib/ai/company-enrichment-gateway.ts)): add optional `signal?: AbortSignal` to the params object.
2. **`runCompanyEnrichmentModelOnlyGeneration`**: add `signal?: AbortSignal` to params; pass `abortSignal: params.signal` to `generateText` when `params.signal` is defined (same for structuring retries via `runOnce`).
3. **Full web path**: pass the same optional signal into **both** Perplexity-phase and structuring-phase `generateText` calls (`abortSignal: params.signal` when defined).
4. **`runCompanyEnrichmentForActiveRow`** ([`src/lib/actions/company-enrichment.ts`](src/lib/actions/company-enrichment.ts)): add optional `signal?: AbortSignal` to the `run` object; forward to `runCompanyEnrichmentGeneration({ ... , signal: run.signal })`.
5. **Abort-like helper** in `company-enrichment.ts`: `DOMException` with `name === "AbortError"` and/or `Error` with `name === "AbortError"`.
6. **`runCompanyEnrichmentForActiveRow` `catch`**: if abort-like, `return { ok: false, error: "ENRICHMENT_ABORTED" }` (no diagnostic); else keep existing mapped error + diagnostic.
7. **`researchCompanyEnrichment`**: add `signal?: AbortSignal` to `options`; pass into `runCompanyEnrichmentForActiveRow`. Keep `if (!result.ok) refund` so **ENRICHMENT_ABORTED** gets a single slot refund like other failures.
8. **Inner `catch`** after `runCompanyEnrichmentForActiveRow`: use `catch (err)`; `refund` then return `{ ok: false, error: "ENRICHMENT_ABORTED" }` if abort-like, else `{ ok: false, error: "ENRICHMENT_FAILED" }`.
9. **Bulk**: omit `signal` on `runCompanyEnrichmentForActiveRow` calls — unchanged behavior.
10. **Modal** ([`AIEnrichmentModal.tsx`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx)): pass `signal` from `enrichmentAbortControllerRef.current?.signal` into `researchCompanyEnrichment` options. After `attachAbortable`, if `!res.ok && res.error === "ENRICHMENT_ABORTED"`, throw `ResearchCompanyEnrichmentClientError("ENRICHMENT_ABORTED")`. In `onError`, treat **silent user abort**: `DOMException` AbortError (existing) **or** `ResearchCompanyEnrichmentClientError` with message `ENRICHMENT_ABORTED` — early return, clear inline error / failure detail so no banner, no toast.

## Verification

- `pnpm typecheck && pnpm check:fix`.

## Note

Client `AbortSignal` passed into Server Actions may not always deserialize on the server depending on framework version; when `signal` is undefined, behavior matches pre-change. When active on the server, `generateText` aborts earlier and slot refund runs via existing `!result.ok` branch.
