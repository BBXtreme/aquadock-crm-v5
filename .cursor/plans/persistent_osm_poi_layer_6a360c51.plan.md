---
name: Persistent OSM POI layer
overview: Flicker-free OSM POIs via merge+dedupe, fetchEpoch stale guards, JSON-safe coverage persistence with optional skip-fetch Phase 2, prune at >6000, and cluster animateAddingMarkers—all without breaking companies, basemap, or popups.
todos:
  - id: types-dedupe
    content: Add osmPoiDedupeKey(poi) + SerializedCoverageBlob types in types.ts; export for OpenMapView + water updater
    status: in_progress
  - id: helpers-persist
    content: OpenMapView — bbox/coverage/merge/prune helpers, fetchedCoverageRef, fetchEpochRef; localStorage v2 read/write + legacy discard
    status: pending
  - id: handleLoad-phase2
    content: Rewrite handleLoad — coverage skip (Phase 2), epoch guard, merge+prune, loading only on real fetch, debounced persist
    status: pending
  - id: clear-cluster
    content: Clear-cache resets coverage+POIs+storage; MarkerClusterGroup animateAddingMarkers true
    status: pending
  - id: verify
    content: pnpm typecheck && pnpm check:fix
    status: pending
isProject: false
---

# ANALYSIS → PLAN → POLISHED CODE

## ANALYSIS

### Current flow ([OpenMapView.tsx](src/components/features/map/OpenMapView.tsx))

- **Events:** `moveend` / `zoomend` → **800ms debounce** → `handleLoad`. Initial POI load also runs once after `mapReady` + `hasCentered`.
- **Zoom gate:** `autoLoadPois` off or `zoom < 13` → no fetch; accumulated `osmPois` are left as-is (only path that avoids churn today).
- **Cache:** `osmCacheRef` is a `Map<string, CacheEntry>` keyed by **`${zoom}-${roundedCenter}`** (0.5° grid). Each entry holds `pois`, `timestamp`, and `L.LatLngBounds`.
- **Hit path:** Fresh (&lt;10 min) **and** `cacheEntry.bounds.contains(currentBounds)` → **`setOsmPois(cacheEntry.pois)`** (full replace).
- **Miss path:** `fetchOsmPois(bounds)` → store entry → **`setOsmPois(pois)`** (full replace with latest bbox only).
- **Render:** `osmMarkers` from `useMemo` over `osmPois`; `MarkerClusterGroup` with `animateAddingMarkers={false}`.
- **Persistence:** `openmap-poi-cache` stores the whole `Map` as JSON. After reload, `bounds` is a **plain object**, not a `LatLngBounds` instance → **`.contains` is unreliable / can throw**, so cache behavior across sessions is fragile.

### Why flicker and duplicates

- **Flicker:** Any successful fetch **replaces** the entire list. POIs outside the new bbox disappear until (or unless) that area is fetched again—users see markers vanish and pop back on small pans.
- **Unnecessary refetches:** The **center+zoom key** often mismatches overlapping views: panning shifts the discrete cell → miss even when geography overlaps → new fetch + replace.
- **“Duplicates”:** [map-utils.ts](src/lib/utils/map-utils.ts) dedupes **within** one Overpass response. With **merge across fetches**, the client must dedupe by OSM id; without merge there are no cross-fetch duplicates but POIs are dropped instead.

### Full replace vs merge (trade-offs)

| Approach | Pros | Cons |
|----------|------|------|
| **Full replace** | Simple; list size tracks current bbox; no client dedupe | **Flicker**; lost context when panning; repeat downloads for overlapping areas unless cache key perfectly tracks viewport |
| **Merge + dedupe** | **Stable layer**; smooth UX; natural dedupe with `${type}/${id}`; works with coverage-based skip | Growing memory → need **prune**; slightly more code; must ignore **stale** HTTP responses (`fetchEpochRef`) |

**Decision:** Adopt **merge + dedupe** as the default; keep full replace only for **explicit clear-cache** (reset layer).

---

## PLAN

### 1. `osmPoiDedupeKey(poi: OsmPoi): string`

- Implement in [types.ts](src/components/features/map/types.ts) as **`${String(poi.type)}/${String(poi.id)}`** (aligned with Overpass dedupe and popups).
- Import in `OpenMapView` for merge, prune logic, and the **water-calculation** `setOsmPois` updater (replace brittle `id`+`type` loose equality with one shared key).

### 2. Merge helper (prefer newer data)

- `mergeOsmPoisPreferIncoming(prev, incoming): OsmPoi[]` using a `Map` keyed by `osmPoiDedupeKey`.
- For each key collision: **`{ ...existing, ...incoming }`** so fresh Overpass fields win while local enrichments on the old object are preserved where incoming omits them.

### 3. `fetchEpochRef`

- Increment at the **start** of each **network** load (after coverage skip).
- In `.then`, bail if `fetchEpochRef.current !== epoch` so slower responses do not merge stale bbox results.
- In `.finally`, call `setLoadingOsm(false)` **only** when `epoch` still matches (avoids clearing spinner for a superseded request).

### 4. `osmCacheRef` + localStorage — **evolve & migrate (safe)**

- **Remove** the old `Map<string, CacheEntry>` center-key cache from the hot path.
- **New persistence (v2):** single key `openmap-poi-cache`, JSON shape `{ v: 2, coverage: SerializedCoverageEntry[] }` where each entry is `{ south, west, north, east, timestamp }` (numbers only).
- **Do not** persist thousands of POIs (quota / perf). In-session POIs live in React state only; after reload, **coverage metadata** still skips refetch inside previously fetched rectangles (within TTL).
- **Migration:** On read, if `v !== 2` or unknown shape → **start with `coverage: []`** (optionally `removeItem` once to avoid re-parsing junk). No attempt to resurrect legacy `L.LatLngBounds` from JSON.

### 5. Coverage-based skipping (**Phase 2 — recommended in same PR**)

- **Phase 1 (minimal):** merge + dedupe + epoch + prune + UX flags → fixes flicker immediately; Overpass still runs per debounced uncached “intent” unless you add skip logic.
- **Phase 2:** `fetchedCoverageRef: SerializedCoverageEntry[]` (same array persisted as v2). Before fetch, if **current `map.getBounds()`** is fully inside **any** fresh entry’s rectangle (SW+NE corners contained, axis-aligned), **return** without `setLoadingOsm` and without network.
- **After each successful fetch:** push bounds (four numbers + timestamp), cap length (e.g. 40), drop oldest.

*Rationale for bundling Phase 2:* Small incremental code; directly addresses “pan back to seen area” and pairs naturally with v2 persistence.

### 6. Memory: prune when &gt; 6000

- After merge, if `length > 6000`, **`pruneOsmPoisOutsidePaddedBounds(pois, viewBounds, padRatio)`** (e.g. `0.35`)—keep POIs whose coordinates fall inside **padded** view; implement padding via explicit lat/lng span math (no non-null assertions).

### 7. UX

- **`animateAddingMarkers={true}`** on `MarkerClusterGroup`.
- **`loadingOsm`:** set `true` only when an Overpass request actually starts (not on Phase 2 skip).

### 8. Clear-cache button

- `fetchedCoverageRef.current = []`; `localStorage.removeItem("openmap-poi-cache")`; `setOsmPois([])`.
- If `zoom >= 13`, **one** `fetchOsmPois` for current bounds, then **merge** into empty state (same code path as normal load / epoch / persist coverage)—or simply `setOsmPois` from result since list was empty; still append coverage entry for consistency.

### 9. Preserved behavior

- `autoLoadPois` + storage + `openmap-settings-changed` listener; CRM companies, `fitMapToCompanyLatLngs` / URL deep link / `didInitialCompanyFitRef`; Google basemap + session toasts; dark mode; legend; `useMapPopupActions`; water updater semantics (via shared dedupe key).

### 10. Rules

- No `!`, no `as any`, no conditional hooks. Replace `lat as number` with a small `poiPosition(poi): [number, number] | null` helper where practical. Run **`pnpm typecheck && pnpm check:fix`**.

---

## POLISHED CODE

Implementation is **two files**. Below is the authoritative bundle to apply when executing this plan (kept in-repo so the plan file stays readable).

### A. [types.ts](src/components/features/map/types.ts) — add after `OsmPoi` interface

```typescript
/** Stable OSM identity for dedupe across fetches (matches Overpass element type/id). */
export function osmPoiDedupeKey(poi: OsmPoi): string {
  return `${String(poi.type)}/${String(poi.id)}`;
}

/** JSON-safe fetched viewport (persisted). Axis-aligned; south/west/north/east in WGS84. */
export interface OsmPoiCoverageEntry {
  south: number;
  west: number;
  north: number;
  east: number;
  timestamp: number;
}

export interface OsmPoiPersistedCacheV2 {
  v: 2;
  coverage: OsmPoiCoverageEntry[];
}
```

- Remove or supersede unused `OsmPoiCacheEntry` if nothing imports it (grep first); otherwise leave deprecated with a one-line comment to avoid churn.

### B. [OpenMapView.tsx](src/components/features/map/OpenMapView.tsx) — integration summary

Add **module-level helpers** (with short comments):

- `OSM_POI_FETCH_TTL_MS`, `MAX_COVERAGE_ENTRIES`, `MAX_OSM_POIS` (6000), `PRUNE_PAD_RATIO`, `LS_KEY`.
- `coverageToBounds`, `boundsToCoverageEntry`, `isFreshCoverage`, `viewportFullyCoveredByAny`, `mergeOsmPoisPreferIncoming`, `padLatLngBounds`, `pruneOsmPoisFarFromView`, `parsePersistedCache`, `isCoverageEntry`.

Add **refs:** `fetchedCoverageRef = useRef<OsmPoiCoverageEntry[]>([])`, `fetchEpochRef = useRef(0)`. **Remove** `osmCacheRef`, `CacheEntry`, and center-key logic.

**Mount effect:** `parsePersistedCache(localStorage.getItem(LS_KEY))` → assign `fetchedCoverageRef.current`.

**Unmount / debounced save:** `JSON.stringify({ v: 2, coverage: fetchedCoverageRef.current })`.

**`handleLoad`:**

1. `setCurrentZoom`, early return if `autoLoadPois` or `zoom < 13`.
2. If `viewportFullyCoveredByAny(bounds, fetchedCoverageRef, now, TTL)` → return.
3. `const epoch = ++fetchEpochRef.current`; `setLoadingOsm(true)`.
4. `fetchOsmPois(bounds).then` → if epoch mismatch return; else push coverage, trim array, `setOsmPois` merge+maybe prune, schedule persist.
5. `catch` / `finally` as above.

**`osmMarkers`:** use `osmPoiDedupeKey` in water updater; optional `poiLatLon` helper for `position={[lat,lon]}`.

**Clear-cache:** reset coverage ref, remove LS, empty POIs, refetch using same epoch rules.

**MarkerClusterGroup:** `animateAddingMarkers={true}`.

---

### Full component listing

The complete updated **OpenMapView.tsx** (~750 lines with helpers) should be produced in the **implementation pass** by editing the current file in the repo (latest main already includes `collectCompanyLatLngs`, `fitMapToCompanyLatLngs`, `didInitialCompanyFitRef`, and URL vs company fit—**preserve all of that** when splicing POI logic). A ready-to-paste single file is too large for this plan’s inline field; when you approve execution, the agent will:

1. Apply **types.ts** exports above.
2. Replace the POI cache/load/save/clear-cluster sections of **OpenMapView.tsx** per the summary while keeping the rest of the file byte-identical where possible.
3. Run `pnpm typecheck && pnpm check:fix`.

---

## Appendix — `handleLoad` reference (canonical logic)

```typescript
const handleLoad = useCallback(() => {
  if (!mapRef.current) return;

  const map = mapRef.current;
  const zoom = map.getZoom();
  setCurrentZoom(zoom);

  if (!autoLoadPois || zoom < 13) return;

  const bounds = map.getBounds();
  const now = Date.now();

  if (viewportFullyCoveredByAny(bounds, fetchedCoverageRef.current, now, OSM_POI_FETCH_TTL_MS)) {
    return;
  }

  const epoch = ++fetchEpochRef.current;
  setLoadingOsm(true);

  fetchOsmPois(bounds)
    .then((result) => {
      if (fetchEpochRef.current !== epoch) return;

      const incoming = result.pois ?? [];
      const entry = boundsToCoverageEntry(bounds, now);
      fetchedCoverageRef.current.push(entry);
      while (fetchedCoverageRef.current.length > MAX_COVERAGE_ENTRIES) {
        fetchedCoverageRef.current.shift();
      }

      setOsmPois((prev) => {
        let next = mergeOsmPoisPreferIncoming(prev, incoming);
        if (next.length > MAX_OSM_POIS) {
          next = pruneOsmPoisFarFromView(next, bounds, PRUNE_PAD_RATIO);
        }
        return next;
      });

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const payload: OsmPoiPersistedCacheV2 = { v: 2, coverage: [...fetchedCoverageRef.current] };
        localStorage.setItem(LS_KEY, JSON.stringify(payload));
      }, 3000);
    })
    .catch((err) => console.error("POI load error:", err))
    .finally(() => {
      if (fetchEpochRef.current === epoch) {
        setLoadingOsm(false);
      }
    });
}, [autoLoadPois]);
```

(Import `OsmPoiPersistedCacheV2` from `./types` if saved to `types.ts`.)
