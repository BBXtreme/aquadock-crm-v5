# Aider task – Create OpenMap Documentation

# OpenMap Documentation (Aquadock CRM)

## Overview
OpenMap is the interactive map view in Aquadock CRM. It shows:
- Your own companies as colored markers (according to status)
- OSM POIs from the public Overpass API as neutral gray ? markers

## Architecture (after refactor)

- `src/components/features/OpenMapClient.tsx` – Thin wrapper + ErrorBoundary
- `src/hooks/useOpenMap.ts` – All business logic, state, loading, listeners
- `src/components/features/OpenMapView.tsx` – Pure UI rendering
- `src/lib/utils/map.ts` – Utility functions (icons, fetch)
- `src/lib/constants/map-poi-config.ts` – Configurable POI categories
- `src/lib/constants/status-colors.ts` – Legend colors

## How it works

1. Open OpenMap from the sidebar
2. The map automatically starts listening to zoom and pan
3. When you zoom in to level **12 or higher**, OSM POIs load automatically in the background
4. Gray ? markers = OSM POIs from public data
5. Colored markers = your CRM companies (color by status)
6. Click on a gray ? marker → "Zu CRM hinzufügen" button
7. After import the POI becomes a company with status "lead" and colored marker

## Controls

- **Search bar** (top left) – Geocode any address
- **Filter chips** (top) – Enable/disable POI categories (Restaurant, Camping, Marina, Boat Rental, Hotel, Resort, Sailing School, Ruderclub, Vereine)
- **Floating buttons** (top right):
  - Refresh – reset view to all CRM companies
  - MapPin – visual loading indicator (spinner while loading)
  - Info – toggle status legend

## Legend
Colored markers represent your CRM companies:
- Lead (amber)
- Qualifiziert (blue)
- Akquise (violet)
- Angebot (emerald green)
- Gewonnen (emerald)
- Verloren (red)
- Kunde (teal)
- Partner (indigo)
- Inaktiv (gray)

## Technical Notes

- Minimum zoom level 12 for OSM POI loading (prevents slow queries and rate limits)
- Multiple Overpass mirror servers with fallback
- Debounced loading (2000ms) to respect API limits
- Automatic deduplication of OSM IDs
- Full dark/light mode support with Carto tiles

## Future Improvements (easy with new structure)

- Save user filter preferences in Supabase
- Admin settings page for POI categories
- Better deduplication against existing companies
- Export / bulk import

Last updated: March 2026