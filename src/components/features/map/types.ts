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

export interface OsmPoiCacheEntry {
  pois: OsmPoi[];
  timestamp: number;
  boundsKey: string;
}
