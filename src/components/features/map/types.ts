// src/components/features/map/types.ts
"use client";

import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";

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
}

export interface OsmPoiCacheEntry {
  pois: OsmPoi[];
  timestamp: number;
  boundsKey: string;
}
