# csv-import-final-polish.md

## Allowlist (strict)

- [src/lib/actions/companies.ts](src/lib/actions/companies.ts)
- [src/components/features/companies/CSVPreviewView.tsx](src/components/features/companies/CSVPreviewView.tsx)
- [src/components/features/companies/CSVImportDialog.tsx](src/components/features/companies/CSVImportDialog.tsx)
- [src/components/features/companies/GeocodeReviewModal.tsx](src/components/features/companies/GeocodeReviewModal.tsx) — only if a small change is needed
- Timeline badge mapping: [src/components/tables/TimelineTable.tsx](src/components/tables/TimelineTable.tsx) (tiny `csv_import` branch for icon + `Badge` variant + label)

## Planned changes (by file)

### 1. [src/components/tables/TimelineTable.tsx](src/components/tables/TimelineTable.tsx)

- Add explicit `csv_import` handling in `activityIcon`, `activityVariant`, and the activity label chain (prefer `useT("timeline")` if a suitable key exists; otherwise align with how other types are labeled in this file).
- Goal: distinct icon (e.g. `FileSpreadsheet` from `lucide-react`) and a badge variant that reads clearly compared to the generic default (`MoreHorizontal` + `outline`).

### 2. [src/components/features/companies/CSVPreviewView.tsx](src/components/features/companies/CSVPreviewView.tsx)

- **Buttons:** tighten disabled/loading states for geocode open / apply / import (e.g. disable import while `geocodeLoading` or `geocodeApplying`; align with existing `isImporting` + `Loader2` patterns).
- **Geocoding success feedback:** after a successful preview batch, add concise success feedback (counts OK vs not OK) without duplicating noisy toasts.
- **Apply success:** refine the existing apply toast to reflect how many coordinates were applied / rows updated.

### 3. [src/lib/actions/companies.ts](src/lib/actions/companies.ts)

- Extend **`importCompaniesFromCSV`** return type with an additive field, e.g. count of imported rows that have both `lat` and `lon` after validation mapping. No change to insert success/failure semantics.

### 3b. [src/components/features/companies/CSVImportDialog.tsx](src/components/features/companies/CSVImportDialog.tsx)

- After a successful import (before optional AI enrichment), show **`toast.success`** that mentions **`imported`** and the new **coordinates** count from the action result (i18n via existing `useT("csvImport")` where possible).

### 4. [src/components/features/companies/GeocodeReviewModal.tsx](src/components/features/companies/GeocodeReviewModal.tsx)

- Edit only if primary/secondary actions or loading state cannot be fixed cleanly from `CSVPreviewView` alone.

## Import success toast + geocoded coordinates

- **Allowlist now includes** [CSVImportDialog.tsx](src/components/features/companies/CSVImportDialog.tsx): wire `toast.success` to the additive **`importCompaniesFromCSV`** field (e.g. rows imported with both coordinates).

## Execution protocol

- After **START POLISH PHASE 1**: one file per phase → show `git diff` for that file → `pnpm typecheck && pnpm check:fix` → wait for **next**.

## Acceptance

- `csv_import` timeline badge is clearly visible (icon + variant + readable label).
- CSV preview geocode/import controls feel clearer under loading.
- Import success toast mentions how many companies were imported and how many include coordinates.
- `pnpm typecheck && pnpm check:fix` passes with zero warnings/errors.
