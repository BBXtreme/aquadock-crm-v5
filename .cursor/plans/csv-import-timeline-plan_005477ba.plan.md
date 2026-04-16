---
name: csv-import-timeline-plan
overview: Add a post-insert CSV-import timeline write path that creates one `csv_import` activity per successfully inserted company, then expose a visible `CSV Import` activity badge in existing timeline UI mappings with minimal, scoped edits.
todos:
  - id: phase-1-import-hook
    content: Extend CSV import action to trigger post-insert timeline creation for inserted companies only.
    status: pending
  - id: phase-2-timeline-helper
    content: Add/reuse timeline helper path for csv_import entries with authenticated context and required fields.
    status: pending
  - id: phase-3-badge-mapping
    content: Add csv_import badge/label mapping in existing timeline UI/type mapping file if needed.
    status: pending
  - id: phase-4-quality-gate
    content: Run and confirm pnpm typecheck && pnpm check:fix with zero warnings/errors.
    status: pending
isProject: false
---

# csv-import-timeline-plan.md

## Scope
Implement only within the allowed files:
- [src/lib/actions/companies.ts](src/lib/actions/companies.ts)
- [src/lib/actions/timeline.ts](src/lib/actions/timeline.ts) or [src/lib/services/timeline.ts](src/lib/services/timeline.ts)
- Existing timeline type/badge mapping file(s) only if required for `CSV Import` badge visibility

## Implementation Steps
1. In [src/lib/actions/companies.ts](src/lib/actions/companies.ts), extend `importCompaniesFromCSV` so timeline creation runs only after successful company insert and only for inserted rows (`data`/`companyIds`).
2. Reuse timeline insert infrastructure by adding/using a helper in the timeline action/service layer that writes `activity_type: "csv_import"` with a title containing `CSV Import`, preserving authenticated user context and RLS-safe server-side execution.
3. Update timeline activity-type badge/label mapping (existing file only) so `csv_import` renders as a visible `CSV Import` badge using existing badge style patterns (icon/variant/label fallback strategy consistent with current timeline UI).
4. Keep behavior resilient: if company insert fails, no timeline writes occur; if timeline write fails, handle according to existing project pattern (prefer non-destructive import success handling unless existing pattern requires hard failure).
5. Run quality gate after each file phase and final pass: `pnpm typecheck && pnpm check:fix`.

## File-by-File Phase Protocol
- Phase 1: edit one file, show diff, run quality gate, wait for `next`.
- Phase 2+: repeat one-file-at-a-time until complete.
- No edits outside the allowed list.

## Acceptance Criteria
- Successful CSV import creates one timeline row per inserted company.
- Timeline rows use `activity_type = "csv_import"`.
- Timeline title contains `CSV Import`.
- Timeline UI shows a visible `CSV Import` badge/tag in the same style family as other activity badges.
- `pnpm typecheck && pnpm check:fix` passes with zero warnings/errors.