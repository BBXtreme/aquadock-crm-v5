---
name: Perplexity locale + settings
overview: Superseded in part — **Low-cost / “Kostengünstiger Modus” removed**; cost/speed is controlled by the company enrichment modal Fast vs Full toggle only. Optional follow-up (Perplexity locale + EAV fast max/recency) can be a separate change; it requires `settings.ts` / `settings/page.tsx` if persisted.
todos:
  - id: remove-low-cost
    content: Remove low-cost EAV, UI, gateway branches, modal hints, i18n (done in implementation pass)
    status: completed
  - id: quality-gate
    content: pnpm typecheck && pnpm check:fix
    status: completed
isProject: false
---

# Plan status

- **Low-cost mode** — Removed application-wide in favor of **Fast vs Full** in the company AI enrichment modal (`webSearchMode`). Fast keeps minimal Perplexity (2, year) and Grok 4.1 Fast + Gemini 3 Flash structuring.
- **Perplexity locale + configurable fast settings** — Deferred; prior numbered steps in this file assumed new EAV keys and `settings.ts` changes.
