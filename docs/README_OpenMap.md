# OpenMap — interactive map (AquaDock CRM v5)

**Last updated:** April 20, 2026  

**In one sentence:** OpenMap shows your **CRM companies** on a map and, when zoomed in enough, nearby **OpenStreetMap (OSM) points of interest**; you can **import** an OSM place as a new company (typically as a **lead**).

---

## Who should read this

- **Product / ops:** Understand what the map does and that POI data is **public OSM data**, not private CRM data until imported.  
- **Developers:** File layout, data flow, and why Overpass is called from the browser.

---

## User-visible behavior

1. Open **OpenMap** from the app navigation (`/openmap`).  
2. Companies that have **latitude and longitude** appear as **colored markers** (colors reflect CRM **status**).  
3. From **zoom level 13** upward, **gray “?” markers** appear for OSM POIs (debounced requests, cached to reduce load on public Overpass servers).  
4. Click a company marker → CRM-focused popup. Click an OSM marker → popup with address/phone/website and actions such as **import to CRM**, **water info** (distance/type), **view on OSM**.  
5. **Import** creates a **company** with `status: "lead"`, sets the **`osm`** field, and may fill **water**-related fields when the user runs that action.

---

## Architecture (code map)

Paths are from the repository root. (Parentheses in route folders break some Markdown link parsers, so paths are shown as code.)

| Path | Role |
| --- | --- |
| `src/app/(protected)/openmap/page.tsx` | Server page: loads companies via services / RLS |
| `src/components/features/map/OpenMapClient.tsx` | Client wrapper: dynamic import, error boundary, Suspense |
| `src/components/features/map/OpenMapView.tsx` | Leaflet map, clustering, theme, controls |
| `src/lib/utils/map-utils.ts` | Icons, `fetchOsmPois`, shared helpers |
| `src/lib/constants/map-poi-config.ts` | POI categories and Overpass tag definitions |
| `src/lib/constants/map-status-colors.ts` | Status → color / label |
| `src/lib/constants/kundentyp.ts` | OSM tags → CRM `kundentyp` |
| `src/lib/constants/wassertyp.ts` | Water type hints |
| `src/lib/utils/calculateWaterDistance.ts` | Distance / type to water |
| `src/lib/constants/overpass-endpoints.ts` | Overpass API endpoints and fallback |

**Popups:** `CompanyMarkerPopup.tsx`, `OsmPoiMarkerPopup.tsx`.

---

## Why companies load on the server but OSM loads in the browser

- **Companies** are private, **RLS-protected** data → fetched with the **server** Supabase client on the page, consistent with the rest of the app.  
- **OSM / Overpass** is **public** data; calling it from the browser avoids an extra proxy, keeps latency low, and matches the current scale of requests. Heavy server-side geoprocessing would be a reason to add API routes later.

---

## Controls and technical notes

- POI auto-load at zoom **≥ 13** (tunable in code).  
- **Caching** (e.g. viewport + `localStorage`) limits repeat queries.  
- **Multiple Overpass mirrors** with fallback help when one instance is slow.  
- **Marker clustering** for dense OSM results.  
- **Basemaps** follow light/dark theme (e.g. Carto).  
- **Refresh** / **clear cache** actions and a **status legend** where implemented.  
- After CRM import, components may listen for a **`company-imported`** event to refresh markers without a full navigation.

---

## Standards

Map code follows the same rules as the rest of the repo: strict TypeScript, Biome, no non-null assertions, null-safe display helpers.

---

AquaDock CRM v5 · 2026
