---
name: csv-import-osm-normalization-plan
overview: Normalize OSM IDs at CSV parse time, align with compact `type/id` format used in cards/OpenMap, and update CSV docs/tests in the exact allowed files.
todos:
  - id: phase1-csv-parser
    content: Implement and wire OSM normalization into parseCSVFile early in csv-import.ts
    status: pending
  - id: phase2-field-guide
    content: Update OSM field example/note in csv-import-fields.ts to reflect accepted input and canonical output
    status: pending
  - id: phase3-tests
    content: Add/adjust csv-import tests for URL normalization, raw compact IDs, invalid silent stripping, and header aliases
    status: pending
  - id: phase4-quality-gate
    content: Run pnpm typecheck && pnpm check:fix and report zero-warning/zero-error status
    status: pending
isProject: false
---

# CSV Import OSM Normalization Plan

## Scope
Implement OSM ID normalization early in CSV parsing so accepted inputs (`openstreetmap.org/<type>/<id>` URLs and raw `<type>/<id>`) are normalized to the canonical compact format (`node/<id>`, `way/<id>`, `relation/<id>`), while invalid values are dropped.

## Canonical Behavior
- Accept:
  - `https://www.openstreetmap.org/node/12345`
  - `https://www.openstreetmap.org/way/12345`
  - `https://www.openstreetmap.org/relation/12345`
  - `node/12345`, `way/12345`, `relation/12345`
- Normalize output to lowercase compact format: `<type>/<digits>`.
- Reject invalid OSM strings by stripping them silently during parse (do not pass invalid values downstream and do not fail the row).
- Keep behavior consistent with existing app expectations in company cards/OpenMap URL builders that consume compact `type/id`.

## Planned File-by-File Changes
- [/Users/marco/code/aquadock-crm-v5/src/lib/utils/csv-import.ts](/Users/marco/code/aquadock-crm-v5/src/lib/utils/csv-import.ts)
  - Add a dedicated OSM normalization helper in CSV pipeline scope.
  - Apply normalization in `parseCSVFile` inside the `case "osm"` branch so normalization happens early.
  - Ensure invalid results are omitted from `parsedRow.osm`.

- [/Users/marco/code/aquadock-crm-v5/src/lib/constants/csv-import-fields.ts](/Users/marco/code/aquadock-crm-v5/src/lib/constants/csv-import-fields.ts)
  - Update OSM example/note text to clearly show accepted forms and canonical stored format.

- [/Users/marco/code/aquadock-crm-v5/src/lib/utils/csv-import.test.ts](/Users/marco/code/aquadock-crm-v5/src/lib/utils/csv-import.test.ts)
  - Add parse tests for:
    - Full OSM URL -> compact format.
    - Raw compact format passthrough.
    - Invalid values removed silently.
    - Header alias coverage (`osm_id` and/or `openstreetmap`) mapping to internal `osm`.

## Execution Protocol (as requested)
1. Wait for `START OSM PHASE 1`.
2. Implement exactly one file at a time.
3. After each file: show diff, run/confirm quality gate status, wait for `next`.
4. Final gate after all edits: `pnpm typecheck && pnpm check:fix` with zero warnings/errors.
