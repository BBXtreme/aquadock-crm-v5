---
name: AI modal € cost pill
overview: Add a German-formatted heuristic € estimate inside the existing usage outline Badge in `AIEnrichmentModal.tsx`, driven by `enrichmentWebMode` and (for full web search) `snapshotPrimary`, without changing header height or other files.
todos:
  - id: helpers-memo
    content: Add de-DE Intl formatter, single ~amount € helper (no ranges), cheap/expensive classifier on gateway id, useMemo for header cost label + optional aria suffix
    status: completed
  - id: badge-ui
    content: Wrap Badge children in inline-flex; append separator + muted span; extend aria-label
    status: completed
  - id: quality-gate
    content: Run pnpm typecheck && pnpm check:fix; fix any issues in AIEnrichmentModal.tsx only
    status: completed
isProject: false
---

# Estimated € cost in AI enrichment usage pill

## Context

The modal header is in [`src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx): a flex row with title (left) and usage pill (right). The usage control is an outline [`Badge`](src/components/ui/badge.tsx) (lines ~546–556) showing `t("aiEnrich.usagePill", { used, limit })`. Web vs model-only is [`enrichmentWebMode`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx) (`CompanyEnrichmentWebSearchMode`). For **full** web search, the client does not send `gatewayModelOverride` (see `mutate` ~343–345); the run uses the org’s primary gateway model from settings — already exposed as [`snapshotPrimary`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx) from `usageQuery.data.primaryGatewayModelId`. That id is the right input for “which model drives cost” in full mode.

**Constraint:** Only this TSX file may change (no new i18n keys, no backend). Cost strings can be composed in-file with `Intl.NumberFormat("de-DE", …)` so decimals use commas. **Polish (user):** prefer **single** tilde amounts (`~0,02 €`, `~0,06 €`, `~0,25 €`) everywhere — no en-dash ranges inside the pill (cleaner, more “instant”).

---

## 1. Placement and layout (inside usage pill, same height)

- **Keep a single Badge** (no second pill) to avoid extra vertical chrome.
- **Content structure:** one horizontal line inside the Badge, e.g.  
  `{usagePill} <separator> {cost}`  
  **Separator (user):** Unicode **thin space** (U+2009) + **bullet** `•` + thin space — `\u2009•\u2009` — matches bullet style used elsewhere in the CRM and reads better at small sizes than `·`.
- **Layout classes on a wrapper inside the Badge:** `inline-flex items-center gap-1.5 whitespace-nowrap` so the pill stays one line in normal widths (matches current “pill” feel and avoids growing header height). If you ever hit extreme narrow widths, `whitespace-nowrap` may clip; the parent Badge already has `shrink-0` — acceptable tradeoff for “don’t make header taller.”
- **Cost segment:** wrap in `<span className="…">` (see §3) so usage numbers stay `tabular-nums` on the outer Badge while the estimate can be slightly de-emphasized.
- **Accessibility:** keep `aria-label={t("aiEnrich.usageHeading")}` or extend it with a short German fragment for the estimate (e.g. append “, geschätzte Kosten …”) **without** new translation keys — use a template literal with the same heuristic string used visually, so SR users get parity.

---

## 2. Cost heuristic and formatting

**Formatting utilities (top-level in the same file, near other small helpers):**

- Use `Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` for numeric parts.
- **Single amount only (no ranges in pill):** `~{formatter.format(amount)} €` → e.g. `~0,06 €` (tilde + space before `€`).

**Heuristic switch — single representative € each** (midpoint of prior bands, cleaner pill):

| Condition | Label |
|-----------|--------|
| `enrichmentWebMode === "model-only"` | `~0,02 €` (fixed; no model branch) |
| `enrichmentWebMode === "full"` and primary model classified **cheap/fast** | `~0,06 €` (represents former ~0,05–0,10 band) |
| `enrichmentWebMode === "full"` and primary model classified **expensive** | `~0,25 €` (represents former ~0,15–0,40 band) |

**Primary model for full mode:** `snapshotPrimary` (typed `EnrichmentGatewayModelId | null`). If the snapshot is still loading and `snapshotPrimary` is `null`, default to **`~0,06 €`** (cheap full-web representative) so the pill never flickers empty without overstating vs expensive.

**Cheap vs expensive classification** (string on gateway id, lowercase):

- **Expensive** if any of: `claude-sonnet`, `claude-opus`; exact `openai/gpt-5.4` (not mini); `gemini-2.5-pro` / other “pro” slugs you care to match (keep the set small and documented in a comment).
- **Otherwise** treat as **cheap** (covers Grok 4.1 Fast, Gemini Flash, Haiku, minis, etc.) — consistent with the existing `modelCostHint` regex philosophy in the same file.

Implement as a small pure function + `useMemo(() => computeLabel(enrichmentWebMode, snapshotPrimary), [enrichmentWebMode, snapshotPrimary])` to avoid recomputation noise.

**Note:** There is already a `modelCostHint` `useMemo` for post-success copy; leave it unchanged unless you intentionally dedupe — scope is header-only.

---

## 3. Tailwind: subtle, professional

- **Badge:** keep existing `variant="outline"` and base classes; optionally add `max-w-[min(100%,14rem)]` only if you see overflow on tiny screens (try without first to minimize diff).
- **Cost `<span>` (user):** prefer **`text-xs`** (or `text-[11px]` if you need a hair more than 12px root) with **`text-muted-foreground/70`** + `font-normal tabular-nums` — avoids overly tiny `text-[10px]` that can look blurry on light backgrounds; still clearly secondary to the usage fraction.
- **Separator:** the thin-space–bullet–thin-space string can sit in the flex row with default/muted text; optionally wrap only the `•` in `text-muted-foreground/50` if you want the bullet slightly softer than the cost digits.

---

## 4. Quality gate (after plan approval)

Run from repo root:

`pnpm typecheck && pnpm check:fix`

Ensure zero Biome/TS issues for the edited file only.

---

## 5. Post-approval implementation note

Plan mode blocks applying edits until you confirm. After approval, the implementation is confined to [`AIEnrichmentModal.tsx`](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx): add the formatter + classifier + `useMemo`, then extend the Badge children as in §1–§3. No other files.

If you need the **entire file contents** in chat after implementation, ask for a paste or use your editor’s diff view — the file is ~900 lines; duplicating it entirely in a message is redundant to the git diff once applied.
