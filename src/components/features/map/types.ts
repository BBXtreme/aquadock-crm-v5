// src/components/features/map/types.ts
// This file defines shared TypeScript types for the OpenMap feature, including types for map companies, OSM POIs, and popup props. These types are used across multiple components in the map feature to ensure consistency and type safety.

"use client";

import type { CompanyForOpenMap } from "@/lib/actions/companies";

/**
 * Shared TypeScript definitions for the OpenMap feature
 * Follows AquaDock CRM v5 standards (March 2026)
 */

export type MapCompany = CompanyForOpenMap;

export interface OsmPoi {
  id: number | string;
  type: string; // Changed from union to string to match fetchOsmPois return type
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string | undefined>;
  // Enriched fields
  osmUrl?: string;
  phone?: string;
  website?: string;
  wasserdistanz?: number | null;
  wassertyp?: string | null;
}

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

export interface CompanyMarkerPopupProps {
  company: MapCompany;
  onOpenDetail?: (companyId: string) => void;
}

export interface OsmPoiMarkerPopupProps {
  poi: OsmPoi;
  isDarkMode?: boolean;
  onImport?: (poi: OsmPoi) => void | Promise<void>;
  onViewInOsm?: (osmUrl: string) => void;
  onCalculateWater?: (poi: OsmPoi) => void | Promise<void>;
}

/** @deprecated Legacy shape; OpenMap uses OsmPoiPersistedCacheV2 coverage-only persistence. */
export interface OsmPoiCacheEntry {
  pois: OsmPoi[];
  timestamp: number;
  boundsKey: string;
}
