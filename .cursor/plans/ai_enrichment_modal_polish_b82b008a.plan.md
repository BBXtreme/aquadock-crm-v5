---
name: AI Enrichment Modal Polish
overview: Polish AIEnrichmentModal header, typography, error surface (shadcn Alert), and light-mode switch via Tailwind only in a single file. Header max-height stays strictly under +30% vs prior caps.
todos:
  - id: header-spacing-type
    content: Apply header shell (<30% max-h), title row, DialogTitle, ghost Badge, controls, status line, content padding.
    status: completed
  - id: error-alert-switch
    content: Replace error div with Alert + AlertCircle; Switch [&>span] thumb ring; bump results text-[10px] to text-xs.
    status: completed
  - id: verify-checks
    content: Run pnpm typecheck && pnpm check:fix.
    status: completed
isProject: false
---

# AIEnrichmentModal visual polish (revised)

## Height constraint (strict, < +30%)

- **Previous caps:** `max-h-[min(200px,30dvh)]` and `sm:max-h-[min(188px,26dvh)]`.
- **+30% ceilings:** `200 × 1.3 = 260px`, `188 × 1.3 ≈ 244px` — any new cap must stay **below** these.
- **Chosen caps (per product):** `max-h-[min(220px,28dvh)]` (+10% px, tighter dvh) and `sm:max-h-[min(200px,24dvh)]` (+6.4% px vs 188) — both **under 30%**.

## Numbered implementation targets

1. **Header shell:** `px-6 pt-8 pb-4 border-border/80 sm:px-8 sm:pt-8 sm:pb-5` + `max-h-[min(220px,28dvh)] sm:max-h-[min(200px,24dvh)]`, keep `min-h-0 shrink-0 overflow-y-auto border-b`.
2. **Title row:** `items-start gap-3 sm:gap-4`, keep `pr-12 sm:pr-14`.
3. **DialogHeader:** `space-y-1` (replace `space-y-0.5`).
4. **DialogTitle:** `text-sm sm:text-base font-semibold leading-tight text-foreground tracking-tight` + `wrap-break-word text-balance`.
5. **Usage pill:** `border-border/50 bg-muted/10 px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground leading-none shadow-none`.
6. **Skeleton:** `h-6 w-16 rounded-full`.
7. **Controls row:** `mt-4 gap-3 sm:mt-4 sm:gap-4`.
8. **Switch:** existing data-state classes + `[&>span]:shadow-sm [&>span]:ring-1 [&>span]:ring-zinc-300/70 dark:[&>span]:ring-zinc-700/60`.
9. **Label:** `text-xs sm:text-sm font-medium leading-normal text-foreground`.
10. **SelectTrigger:** `h-9 w-full text-sm sm:h-9`.
11. **Status line:** `mt-3 text-pretty text-xs sm:text-sm leading-normal` + `(full || modelUsed) ? text-muted-foreground/90 : text-amber-900/85 dark:text-amber-300/90`.
12. **Content scroll area:** `px-6 py-3 sm:px-8 sm:py-4`.
13. **Error:** `Alert variant="destructive"` + `AlertCircle` + conditional `AlertTitle` branches + `AlertDescription` wrapping diagnostic block; `rounded-xl border-destructive/30 px-4 py-3`; outer stack `space-y-3`.
14. **Results microcopy:** summary label + footnotes `text-[10px]` → `text-xs` with `text-muted-foreground/90` where applicable.
15. **DialogFooter:** `px-6 sm:px-8` to align with content.

## Constraints

- **Only** [src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx](src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx).
- No JS logic, hooks, or conditional **structure** changes (same ternary/map shapes; Alert is a presentational swap).
