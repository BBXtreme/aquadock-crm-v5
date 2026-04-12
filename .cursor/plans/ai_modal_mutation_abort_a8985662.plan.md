---
name: AI modal mutation abort
overview: Add client-side cancellation in `AIEnrichmentModal.tsx` using a per-run `AbortController`, a small promise wrapper around `researchCompanyEnrichment`, and a single `requestClose` path so closing the dialog (any route) aborts the in-flight run, resets UI state via existing effects, and suppresses abort noise in `onError`—without touching server actions or gateway code.
todos:
  - id: helpers-refs
    content: Add attachAbortable helper + enrichmentAbortControllerRef + isPendingRef; abort previous AC at start of each run
    status: completed
  - id: mutation-wrap
    content: Wrap researchCompanyEnrichment in mutationFn with attachAbortable; onError early-return for AbortError only
    status: completed
  - id: close-paths
    content: Add requestClose(); use on Dialog, Close button, handleApply; extend !open effect with abort+clear ref
    status: completed
isProject: false
---

# AI enrichment modal: client-side cancellation plan

## Context (from codebase)

- Enrichment runs through [`useMutation`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx) calling the server action [`researchCompanyEnrichment`](src/lib/actions/company-enrichment.ts) (no `signal` in its public API; **no edits outside the modal** per your constraint).
- Stale-run suppression already exists via [`activeRunGenerationRef`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx) in `onSuccess` / `onError`.
- Close paths today: [`Dialog`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx) `onOpenChange={onOpenChange}`, footer **Close** button calling `onOpenChange(false)` directly (bypasses `Dialog`’s `onOpenChange`), and **Apply** calling `onOpenChange(false)` after success.
- Installed **@tanstack/query-core** (`MutationFunctionContext`): only `client`, `meta`, `mutationKey` — **no `signal` on mutations** in v5.96. `reset()` disconnects the observer but **does not abort** the underlying `mutationFn` promise.

## 1) How `AbortController` integrates with the mutation

- Add a ref, e.g. `enrichmentAbortControllerRef: RefObject<AbortController | null>`, holding the controller for the **current** enrichment attempt.
- In **`startEnrichmentRun`** (before `activeRunGenerationRef` bump / `mutate`):
  - Call `enrichmentAbortControllerRef.current?.abort()` to drop any previous in-flight attach (e.g. rapid retry edge cases).
  - `const ac = new AbortController(); enrichmentAbortControllerRef.current = ac;`
  - Keep the existing `activeRunGenerationRef` increment, state reset, `reset()`, and `mutate(gen)` unchanged in intent.
- In **`mutationFn`**, read `const signal = enrichmentAbortControllerRef.current?.signal` synchronously at the start of the async function (same tick as `mutate` schedules work), then await:

  `attachAbortable(researchCompanyEnrichment(company.id, { ... }), signal)`

  where `attachAbortable(promise, signal)` is a small local helper (top of file, next to other helpers) that:
  - If `signal` is `undefined`, returns `promise` unchanged (same behavior as today).
  - If `signal.aborted`, rejects with `new DOMException("Aborted", "AbortError")`.
  - Otherwise registers a one-shot `"abort"` listener that rejects with the same `DOMException`, and settles the outer promise from `promise` only if not aborted after completion (use a `settled` flag so late resolve/reject after abort does not double-settle).

This is the practical **mutation + abort** pattern for this TanStack version: **manual controller** + promise boundary (TanStack’s mutation context does not supply `signal` here).

## 2) Exact changes to `useMutation` and close behavior

**`useMutation`**

- Extend `mutationFn` signature to capture `signal` only from the ref (not from TanStack context).
- No changes to success payload shape or thrown `ResearchCompanyEnrichmentClientError` paths.
- **`onError`**: add a **single guard at the top** — if the error is an abort (`err instanceof DOMException && err.name === "AbortError"`), `return` immediately (no `setEnrichmentFailureDetail`, no `setEnrichmentInlineError`, no `toast.error`). All existing branches below stay verbatim for real failures.
- **`onSuccess`**: unchanged (stale runs already guarded by `activeRunGenerationRef`).

**Close / `onOpenChange(false)` while pending**

- Add `isPendingRef` updated every render (`isPendingRef.current = isPending`) so callbacks are not stale inside event handlers.
- Add **`requestClose()`** (or `handleRequestClose`) used everywhere the modal asks to close:
  - If `!isPendingRef.current`: call `onOpenChange(false)` only.
  - If pending: set `activeRunGenerationRef.current = 0` **first** (preserves and strengthens the generation guard against races where `onError` runs before the `open` effect), then `enrichmentAbortControllerRef.current?.abort()`, then `onOpenChange(false)`.
- Wire **`Dialog`**: `onOpenChange={(next) => { if (!next) requestClose(); else onOpenChange(true); }}` — or simply `onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}` so open requests still delegate to parent.
- Replace footer **Close** `onClick={() => onOpenChange(false)}` with `onClick={requestClose}`.
- In **`handleApply`**, replace `onOpenChange(false)` with `requestClose()` (safe: apply disables while pending).

**Existing `useEffect` on `open`**

- In the `!open` branch, at the top, call `enrichmentAbortControllerRef.current?.abort()` and set `enrichmentAbortControllerRef.current = null` (idempotent cleanup when parent forces `open` false without going through Radix).
- Keep `activeRunGenerationRef.current = 0`, state resets, `reset()`, and timeout cleanup as they are today.

**`startEnrichmentRun`**

- As above: abort previous controller, assign new `AbortController` before `mutate`.

## 3) Ensuring the request is “truly” cancelled (network + AI Gateway)

**What this change guarantees (client-only, one file)**

- The mutation promise **rejects promptly** on close, so TanStack leaves `isPending` and the modal’s progress UI can stop without waiting for the server.
- UI and callback guards: **`activeRunGenerationRef` zeroed before abort** + existing checks prevent applying stale AI results or showing errors for the cancelled run.

**What cannot be guaranteed without server/framework changes**

- [`researchCompanyEnrichment`](src/lib/actions/company-enrichment.ts) is a **Next.js Server Action**; the modal cannot pass an `AbortSignal` through its typed API without editing that file. Wrapping the returned promise **does not** cancel the underlying HTTP/RSC request unless the framework propagates client disconnect (implementation-dependent).
- Therefore **AI Gateway / model spend** may still complete server-side if the action keeps running; **daily slot commit** happens early in the action (`tryCommitEnrichmentSlots`), so cancellation after the request reached the server may **not** roll back usage unless the server handles disconnect (out of scope per your constraint).

**Honest expectation to document in PR/review**

- This delivers **best-effort client cancellation**: immediate local abort semantics, no spurious error toast for user-initiated cancel, and alignment with the requested **TanStack-style** pattern given the installed library’s mutation API.

## 4) Verification

- Run `pnpm typecheck && pnpm check:fix` after implementation (per your requirement).
- Manually: open modal, close via overlay / Esc / Close while skeleton pending — UI should reset quickly; no error toast for abort; no suggestion table from a cancelled run.
