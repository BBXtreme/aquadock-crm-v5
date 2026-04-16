# AquaDock CRM v5 – Refined CSV Lat/Lon Import Plan (2026-04-16)

## Scope And Objective

Fix the CSV coordinate import pipeline so latitude/longitude values are parsed safely, validated strictly, and persisted reliably for OpenMap rendering and downstream distance calculations.  
This plan follows strict zero-tolerance quality rules and only targets approved files.

## Confirmed Root Cause

- `parseGermanFloat` currently removes all dots before parsing, which corrupts dot-decimal coordinates.
- Example: `"50.1234"` becomes `"501234"` and is stored out of WGS84 bounds.
- CSV Zod validation currently accepts `z.number().optional()` for `lat` and `lon` without range constraints.
- Server action currently inserts `lat`/`lon` without final range guard.
- OpenMap already filters invalid values at render time, so markers disappear instead of crashing, creating silent data loss UX.

## Mandatory Parser Implementation (Use Exactly)

```typescript
export function parseCoordinate(
  value: string | undefined | null,
  kind: "lat" | "lon"
): number | undefined {
  if (!value || typeof value !== "string") return undefined;

  let cleaned = value.trim().replace(/[°′″'"]+/g, "");
  if (!cleaned) return undefined;

  // European format: comma as decimal, no dot present
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  }
  // Mixed separators – last separator is decimal
  else if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return undefined;

  const [min, max] = kind === "lat" ? [-90, 90] : [-180, 180];
  return num >= min && num <= max ? num : undefined;
}
```

## Strict Execution Order

### Priority 1 (Implement First, In Exact Sequence)

1. **Phase 1.1** – Add `parseCoordinate` in `src/lib/utils/csv-import.ts` and switch `lat`/`lon` parsing to it.
2. **Phase 1.2** – Strengthen Zod in `src/lib/validations/csv-import.ts` with strict coordinate ranges.
3. **Phase 1.3** – Add server-side `validCoordOrNull` guard in `src/lib/actions/companies.ts`.
4. **Phase 1.4** – Update `src/lib/utils/csv-import.test.ts` with robust coordinate parsing/range tests.
5. **Phase 3.1** – Create and document `src/sql/fix-lat-lon-out-of-range.sql`.
6. **Phase 5.1** – Update coordinate examples/notes in `src/lib/constants/csv-import-fields.ts`.
7. **Phase 5.2** – Extract shared geo helpers into `src/lib/utils/geo.ts` and wire `src/components/features/map/OpenMapView.tsx` to import them.

### Priority 2 (Only After Priority 1 Is Merged And Verified)

8. **Phase 2** – Implement coordinate quality indicators and problem-rows panel in `src/components/features/companies/CSVPreviewView.tsx`.

### Deferred (Not In This Task)

- **Phase 4 (Nominatim geocoding + review modal) is deferred to a separate future ticket.**
- Do **not** create:
  - `src/lib/utils/geocode-nominatim.ts`
  - `src/components/features/companies/GeocodeReviewModal.tsx`

## File Allowlist (Strict)

Only these files may be edited/created in this task:

- `src/lib/utils/csv-import.ts`
- `src/lib/validations/csv-import.ts`
- `src/lib/actions/companies.ts`
- `src/lib/utils/csv-import.test.ts`
- `src/lib/constants/csv-import-fields.ts`
- `src/sql/fix-lat-lon-out-of-range.sql` (new)
- `src/lib/utils/geo.ts` (new)
- `src/components/features/map/OpenMapView.tsx` (only import/use shared geo helpers)
- `src/components/features/companies/CSVPreviewView.tsx` (Priority 2 only)

No other files may be modified.

## Implementation Details By Phase

### Phase 1.1 – `src/lib/utils/csv-import.ts`

- Add `parseCoordinate` exactly as specified above.
- Keep `parseGermanFloat` for non-coordinate fields such as `wasser_distanz`.
- Replace coordinate mapping logic:
  - `lat: parseCoordinate(trimmedValue, "lat")`
  - `lon: parseCoordinate(trimmedValue, "lon")`
- Preserve existing CSV header mapping behavior and required-field rules.

### Phase 1.2 – `src/lib/validations/csv-import.ts`

- Update schema with range validation:
  - `lat: z.number().min(-90).max(90).optional()`
  - `lon: z.number().min(-180).max(180).optional()`
- Keep schema `.strict()`.

### Phase 1.3 – `src/lib/actions/companies.ts`

- Add a local helper:
  - `validCoordOrNull(value, min, max): number | null`
- Apply helper when mapping insert rows:
  - `lat: validCoordOrNull(row.lat, -90, 90)`
  - `lon: validCoordOrNull(row.lon, -180, 180)`
- Keep all other mapping behavior unchanged.

### Phase 1.4 – `src/lib/utils/csv-import.test.ts`

- Add explicit tests for:
  - Dot decimals (`"50.1234"`)
  - Comma decimals (`"50,1234"`)
  - Mixed separators
  - Degree symbol cleanup
  - Out-of-range rejection (`"200"` for lat)
  - Invalid input rejection (`""`, `"abc"`, `null`, `undefined`)
- Update existing import tests to verify dot-decimal coordinates are no longer mangled.

### Phase 3.1 – `src/sql/fix-lat-lon-out-of-range.sql`

- Create one-time SQL cleanup script to null invalid stored coordinates:
  - `lat` outside `[-90, 90]`
  - `lon` outside `[-180, 180]`
- Include concise header comments:
  - Purpose
  - Safe usage note
  - Intended run context (admin/manual one-time cleanup)

### Phase 5.1 – `src/lib/constants/csv-import-fields.ts`

- Improve coordinate field examples and notes to explicitly support both decimal separators.
- Clarify that out-of-range coordinates are ignored.
- Avoid changing unrelated field mappings.

### Phase 5.2 – Shared Geo Utility Extraction

#### `src/lib/utils/geo.ts` (new)

- Export:
  - `toFiniteLatLon(value: unknown): number | null`
  - `isWgs84Degrees(lat: number, lon: number): boolean`

#### `src/components/features/map/OpenMapView.tsx`

- Replace local helper definitions with imports from `src/lib/utils/geo.ts`.
- Do not alter map behavior beyond this extraction.

### Priority 2 – `src/components/features/companies/CSVPreviewView.tsx`

- Add coordinate quality UX:
  - Green: valid lat/lon pair
  - Yellow: missing or partial coordinate data
  - Red: invalid/unusable coordinate condition
- Add a problem-rows panel summarizing invalid/missing coordinate rows.
- Keep implementation scoped to approved component and existing UI patterns.

## Quality Gate (Mandatory After Every File Change During Execution)

Run and pass with zero warnings/errors:

```bash
pnpm typecheck && pnpm check:fix
```

No exceptions.

## Execution Protocol After Approval

- Wait for explicit command: **“START PHASE 1”**.
- Implement exactly one file at a time in Priority 1 order.
- After each file:
  - Show exact diff/code change.
  - Confirm quality gate pass.
  - Wait for user command: **“next”** before moving on.

