# OpenMap Documentation (Aquadock CRM)

## Overview
**OpenMap** is the modern interactive map view in **Aquadock CRM v5**.  
It displays:
- **Your CRM companies** as colored status markers
- **Public OSM POIs** (from Overpass API) as neutral gray `?` markers

Users can import POIs directly into the CRM with one click (becomes a company with `status: "lead"` and populated `osm` field).

**Last updated**: March 2026 (Full React + Leaflet refactor)

## Architecture

| File                                            | Purpose                                                      |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `src/components/features/map/OpenMapClient.tsx` | Thin wrapper + ErrorBoundary + Suspense + dynamic import (SSR-safe)     |
| `src/components/features/map/OpenMapView.tsx`   | Main Leaflet map UI, state, clustering, dark mode            |
| `src/lib/utils/map-utils.ts`                    | Core utilities (`getStatusIcon`, `getOsmPoiIcon`, `fetchOsmPois`) |
| `src/lib/constants/map-poi-config.ts`           | POI categories & Overpass tag definitions                    |
| `src/lib/constants/map-status-colors.ts`        | Status colors + labels                                       |
| `src/lib/constants/kundentyp.ts`                | OSM tag → `kundentyp` mapping                                |
| `src/lib/constants/wassertyp.ts`                | Water type detection                                         |
| `src/lib/utils/calculateWaterDistance.ts`       | Distance + type to nearest water body                        |
| src/lib/constants/overpass-endpoints.ts         | Overpass API endpoints                                       |

**Key supporting files**: `CompanyMarkerPopup.tsx`, `OsmPoiMarkerPopup.tsx`

## How It Works

1. Open **OpenMap** from the sidebar.
2. Companies with `lat`/`lon` are fetched server-side and rendered as colored markers.
3. When zoomed to **level 13 or higher**, OSM POIs load automatically (debounced, cached in localStorage).
4. Gray `?` markers = public OSM data.
5. Click a gray marker → rich popup with:
   - Address, phone, website
   - "In CRM importieren"
   - "Wasser-Info berechnen"
   - "In OSM ansehen"
6. On import the POI becomes a new company (`status: "lead"`, `osm` field set, optional water data).

## Controls & Features

- Auto POI loading at zoom ≥ 13 (configurable)
- Smart caching (10 min per viewport + localStorage)
- Multiple Overpass mirror servers with fallback + retry
- Marker clustering for OSM POIs
- Full dark/light mode support (Carto basemaps)
- Status legend toggle
- Refresh companies + Clear cache buttons
- Water distance calculation with geometry sampling + containment fallback

## Technical Highlights

- Direct browser `fetch` to Overpass (no API routes)
- Debounced + cached queries (respects rate limits)
- Deduplication by OSM `type/id`
- Leaflet + react-leaflet with proper SSR handling
- No `!` assertions, full null safety, strict TypeScript
- Follows AIDER-RULES.md (hooks ordering, Biome compliance)
- Event-driven refresh via custom `company-imported` event
- Suspense boundary for loading states

## Why No `route.ts` API Routes?

We deliberately do **not** use API routes for OpenMap because:

1. **Companies** are loaded server-side in `app/openmap/page.tsx` using the service layer (`getCompaniesForOpenMap`). This is faster, more secure, and respects RLS natively.
2. **OSM POIs** and water distance calculations are lightweight client-side operations — direct `fetch` to Overpass is simpler and more efficient.
3. No unnecessary proxy layer, lower latency, better DX.
4. Popup actions use the Supabase browser client + existing service layer.

An API route would only be added if heavy server-side processing (e.g. bulk PostGIS operations) is introduced later.

## Future Improvements

- Extract business logic into dedicated `useOpenMap.ts` hook
- Persist user settings (auto-load, filters) in `user_settings` table
- Admin interface for POI categories
- Fuzzy deduplication before import
- Supabase Realtime marker updates

**Status**: Production-ready, clean, and fully aligned with v5 architecture.

Built with ❤️ at Waterfront Beach • 2026
