// src/components/features/map/OpenMapView.tsx
// This component renders the main map view using Leaflet, showing company markers and OSM POIs.
// It includes logic for fetching POIs based on map bounds with caching, handling marker popups, and user interactions.

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import L from "leaflet";
import { useSearchParams } from "next/navigation";
import {
  type MutableRefObject,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { toast } from "sonner";

import "leaflet/dist/leaflet.css";
import "./leaflet-popup-theme.css";

import { Building, Info, Loader2, MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OpenMapViewSkeleton } from "@/components/ui/page-list-skeleton";
import type { CompanyForOpenMap } from "@/lib/actions/companies";
import { statusColors, statusLabels } from "@/lib/constants/map-status-colors";
import { resolveOpenmapUserPreferences } from "@/lib/constants/openmap-user-settings";
import { getOpenmapStatusMsgKey } from "@/lib/i18n/openmap-status";
import { useT } from "@/lib/i18n/use-translations";
import { createGoogleMapTilesSession, resolveBasemap } from "@/lib/map/map-provider";
import { loadMapSettings } from "@/lib/services/map-settings";
import { fetchOpenmapUserPreferenceRows } from "@/lib/services/openmap-user-preferences";
import { cn } from "@/lib/utils";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map-utils";

import CompanyMarkerPopup from "./CompanyMarkerPopup";
import OsmPoiMarkerPopup from "./OsmPoiMarkerPopup";
import {
  type OsmPoi,
  type OsmPoiCoverageEntry,
  type OsmPoiPersistedCacheV2,
  osmPoiDedupeKey,
} from "./types";
import { useMapPopupActions } from "./useMapPopupActions";

const OPENMAP_POI_LS_KEY = "openmap-poi-cache";
const MAX_OSM_FETCH_COVERAGE_ENTRIES = 40;
const OSM_PRUNE_PAD_RATIO = 0.35;
const OSM_POI_ENTER_ANIM_MS = 520;
const CACHED_POIS_LOADED_BADGE_MS = 2500;
const CACHED_POIS_LOADED_BADGE_REDUCED_MOTION_MS = 400;

/** Runtime check for persisted coverage rows (localStorage v2). */
function isOsmPoiCoverageEntry(x: unknown): x is OsmPoiCoverageEntry {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.south === "number" &&
    typeof o.west === "number" &&
    typeof o.north === "number" &&
    typeof o.east === "number" &&
    typeof o.timestamp === "number"
  );
}

/** Reads v2 `{ v: 2, coverage }` only; legacy blobs yield []. */
function parseOpenmapPoiCoverageFromLs(raw: string | null): OsmPoiCoverageEntry[] {
  if (raw === null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return [];
    const o = parsed as Record<string, unknown>;
    if (o.v !== 2) return [];
    const cov = o.coverage;
    if (!Array.isArray(cov)) return [];
    return cov.filter(isOsmPoiCoverageEntry);
  } catch {
    return [];
  }
}

function coverageToLeafletBounds(entry: OsmPoiCoverageEntry): L.LatLngBounds {
  return L.latLngBounds(L.latLng(entry.south, entry.west), L.latLng(entry.north, entry.east));
}

function boundsToCoverageEntry(bounds: L.LatLngBounds, timestamp: number): OsmPoiCoverageEntry {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return { south: sw.lat, west: sw.lng, north: ne.lat, east: ne.lng, timestamp };
}

/** True if axis-aligned `inner` lies fully inside `outer` (Leaflet contains on SW+NE). */
function innerFullyInsideOuter(outer: L.LatLngBounds, inner: L.LatLngBounds): boolean {
  return outer.contains(inner.getSouthWest()) && outer.contains(inner.getNorthEast());
}

function viewportFullyCoveredByAny(
  view: L.LatLngBounds,
  coverage: OsmPoiCoverageEntry[],
  now: number,
  ttlMs: number,
  inflateRatio: number,
): boolean {
  for (const e of coverage) {
    if (now - e.timestamp >= ttlMs) continue;
    const ob = padLatLngBounds(coverageToLeafletBounds(e), inflateRatio);
    if (innerFullyInsideOuter(ob, view)) return true;
  }
  return false;
}

/** Merges lists; on key collision, incoming fields overlay existing (fresh Overpass wins, local enrichments kept for missing keys). */
function mergeOsmPoisPreferIncoming(prev: OsmPoi[], incoming: OsmPoi[]): OsmPoi[] {
  const map = new Map<string, OsmPoi>();
  for (const p of prev) {
    map.set(osmPoiDedupeKey(p), p);
  }
  for (const p of incoming) {
    const k = osmPoiDedupeKey(p);
    const old = map.get(k);
    map.set(k, old !== undefined ? { ...old, ...p } : p);
  }
  return [...map.values()];
}

function padLatLngBounds(bounds: L.LatLngBounds, padRatio: number): L.LatLngBounds {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const latSpan = ne.lat - sw.lat;
  const lngSpan = ne.lng - sw.lng;
  return L.latLngBounds(
    L.latLng(sw.lat - latSpan * padRatio, sw.lng - lngSpan * padRatio),
    L.latLng(ne.lat + latSpan * padRatio, ne.lng + lngSpan * padRatio),
  );
}

/** Drops POIs outside a padded view (memory cap after heavy exploration). */
function pruneOsmPoisFarFromView(pois: OsmPoi[], viewBounds: L.LatLngBounds, padRatio: number): OsmPoi[] {
  const padded = padLatLngBounds(viewBounds, padRatio);
  const out: OsmPoi[] = [];
  for (const p of pois) {
    const lat = p.lat ?? p.center?.lat;
    const lon = p.lon ?? p.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number" || Number.isNaN(lat) || Number.isNaN(lon)) {
      continue;
    }
    if (padded.contains(L.latLng(lat, lon))) out.push(p);
  }
  return out;
}

function osmPoiPosition(poi: OsmPoi): [number, number] | null {
  const lat = poi.lat ?? poi.center?.lat;
  const lon = poi.lon ?? poi.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number" || Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  return [lat, lon];
}

/** Keys for POIs that appear in `incoming` but not in `prev` (for one-shot enter animation). */
function collectFreshOsmPoiKeys(prev: OsmPoi[], incoming: OsmPoi[]): Set<string> {
  const prevKeys = new Set(prev.map(osmPoiDedupeKey));
  const fresh = new Set<string>();
  for (const p of incoming) {
    const k = osmPoiDedupeKey(p);
    if (!prevKeys.has(k)) fresh.add(k);
  }
  return fresh;
}

/** Accepts DB/JSON lat-lon as number or numeric string; rejects NaN. */
function toFiniteLatLon(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Rejects bogus coordinates (e.g. microdegrees or corrupted imports) that blow up LatLngBounds / fitBounds. */
function isWgs84Degrees(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function collectCompanyLatLngs(companies: CompanyForOpenMap[]): L.LatLng[] {
  const out: L.LatLng[] = [];
  for (const c of companies) {
    const lat = toFiniteLatLon(c.lat);
    const lon = toFiniteLatLon(c.lon);
    if (lat !== null && lon !== null && isWgs84Degrees(lat, lon)) {
      out.push(L.latLng(lat, lon));
    }
  }
  return out;
}

/** Fit the map to all CRM company coordinates (tight zoom, shared by initial load + “all companies” control). */
function fitMapToCompanyLatLngs(map: L.Map, latLngs: L.LatLng[]) {
  map.invalidateSize();
  const apply = () => {
    if (latLngs.length === 0) {
      map.flyTo([51.1657, 10.4515], 7);
      return;
    }

    if (latLngs.length === 1) {
      const [only] = latLngs;
      if (!only) return;
      const z = Math.min(map.getMaxZoom(), 16);
      map.flyTo(only, z);
      return;
    }

    const bounds = L.latLngBounds(latLngs);
    const maxZ = map.getMaxZoom();
    map.flyToBounds(bounds, {
      padding: [48, 48],
      maxZoom: maxZ,
      animate: true,
    });
  };
  requestAnimationFrame(apply);
}

/** Binds the Leaflet map instance to a ref (reliable with React 19; avoids MapContainer ref edge cases). */
function MapRefBinder({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

const MapEventHandler = ({ onBoundsChange }: { onBoundsChange: () => void }) => {
  useMapEvents({
    moveend: onBoundsChange,
    zoomend: onBoundsChange,
  });
  return null;
};

type OpenMapBasemapConfig = ReturnType<typeof resolveBasemap>;

type OpenMapLeafletCoreProps = {
  mapRef: MutableRefObject<L.Map | null>;
  isDarkMode: boolean;
  basemap: OpenMapBasemapConfig;
  validCompanies: CompanyForOpenMap[];
  osmMarkers: ReactNode;
  onBoundsDebounced: () => void;
  onShellReady: () => void;
  onOpenCompanyDetail: (companyId: string) => void;
};

/**
 * Isolated from loading / hint state so `setLoadingOsm` does not reconcile the whole Leaflet tree
 * (avoids cluster layers briefly dropping markers during Overpass fetches).
 */
const OpenMapLeafletCore = memo(function OpenMapLeafletCore({
  mapRef,
  isDarkMode,
  basemap,
  validCompanies,
  osmMarkers,
  onBoundsDebounced,
  onShellReady,
  onOpenCompanyDetail,
}: OpenMapLeafletCoreProps) {
  return (
    <MapContainer
      center={[50.1109, 8.6821]}
      zoom={7}
      style={{ height: "100%", width: "100%" }}
      className={cn("z-0", isDarkMode && "aquadock-map--dark")}
      whenReady={() => {
        queueMicrotask(() => {
          onShellReady();
        });
      }}
      preferCanvas={true}
    >
      <TileLayer key={basemap.tileLayerReactKey} attribution={basemap.attribution} url={basemap.url} />

      <MapRefBinder mapRef={mapRef} />

      {validCompanies.map((company) => {
        const lat = toFiniteLatLon(company.lat);
        const lon = toFiniteLatLon(company.lon);
        if (lat === null || lon === null) return null;
        return (
          <Marker key={company.id} position={[lat, lon]} icon={getStatusIcon(company.status)}>
            <Popup>
              <CompanyMarkerPopup company={company} onOpenDetail={onOpenCompanyDetail} />
            </Popup>
          </Marker>
        );
      })}

      <MapEventHandler onBoundsChange={onBoundsDebounced} />

      <MarkerClusterGroup
        chunkedLoading={false}
        maxClusterRadius={50}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        removeOutsideVisibleBounds={false}
        animateAddingMarkers={true}
        iconCreateFunction={(cluster: { getChildCount: () => number }) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="background-color:${isDarkMode ? "#374151" : "white"};color:${isDarkMode ? "white" : "#374151"};width:36px;height:36px;border-radius:50%;border:3px solid ${isDarkMode ? "#9ca3af" : "#d1d5db"};display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;">${count}</div>`,
            className: "custom-cluster",
            iconSize: [36, 36],
          });
        }}
        polygonOptions={{
          color: isDarkMode ? "#4b5563" : "#9ca3af",
          weight: 2,
          opacity: 0.5,
          fillOpacity: 0.1,
        }}
      >
        {osmMarkers}
      </MarkerClusterGroup>
    </MapContainer>
  );
});

export default function OpenMapView({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const t = useT("openmap");
  const mapRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<OsmPoi[]>([]);
  const osmPoisRef = useRef<OsmPoi[]>([]);
  const [osmPoiEnterKeys, setOsmPoiEnterKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [cachedPoisLoadedBadgeVisible, setCachedPoisLoadedBadgeVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const poiEnterClearTimeoutRef = useRef<number | null>(null);
  const cachedLoadedBadgeTimeoutRef = useRef<number | null>(null);
  const forceViewportOsmFetchRef = useRef(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const fetchedCoverageRef = useRef<OsmPoiCoverageEntry[]>([]);
  const fetchEpochRef = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [autoLoadPois, setAutoLoadPois] = useState(true);
  const [companies, setCompanies] = useState<CompanyForOpenMap[]>(initialCompanies);
  const [hasCentered, setHasCentered] = useState(false);
  const [googleSession, setGoogleSession] = useState<string | null>(null);
  const googleTilesCacheRef = useRef<{ cacheKey: string; session: string } | null>(null);
  const googleSessionRequestEpochRef = useRef(0);
  const didInitialCompanyFitRef = useRef(false);

  const searchParams = useSearchParams();

  const { openCompanyDetail, importOsmPoi, viewInOsm, calculateWaterForPoi } = useMapPopupActions();

  const openCompanyDetailRef = useRef(openCompanyDetail);
  openCompanyDetailRef.current = openCompanyDetail;
  const stableOpenCompanyDetail = useCallback((companyId: string) => {
    openCompanyDetailRef.current(companyId);
  }, []);

  const handleMapShellReady = useCallback(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    osmPoisRef.current = osmPois;
  }, [osmPois]);

  const armPoiEnterAnimation = useCallback((incoming: OsmPoi[], prevSnapshot: OsmPoi[]) => {
    const fresh = collectFreshOsmPoiKeys(prevSnapshot, incoming);
    if (fresh.size === 0) return;
    if (poiEnterClearTimeoutRef.current !== null) {
      clearTimeout(poiEnterClearTimeoutRef.current);
    }
    setOsmPoiEnterKeys(fresh);
    poiEnterClearTimeoutRef.current = window.setTimeout(() => {
      setOsmPoiEnterKeys(new Set());
      poiEnterClearTimeoutRef.current = null;
    }, OSM_POI_ENTER_ANIM_MS);
  }, []);

  const queryClient = useQueryClient();

  const { data: openmapPreferenceRows = [] } = useQuery({
    queryKey: ["openmap-user-preferences"],
    queryFn: fetchOpenmapUserPreferenceRows,
    staleTime: 60 * 1000,
  });

  const openmapPrefsResolved = useMemo(
    () => resolveOpenmapUserPreferences(openmapPreferenceRows, autoLoadPois),
    [openmapPreferenceRows, autoLoadPois],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const showCachedLoadedBadge = useCallback(() => {
    setCachedPoisLoadedBadgeVisible(true);
    if (cachedLoadedBadgeTimeoutRef.current !== null) {
      clearTimeout(cachedLoadedBadgeTimeoutRef.current);
    }
    const ms = prefersReducedMotion ? CACHED_POIS_LOADED_BADGE_REDUCED_MOTION_MS : CACHED_POIS_LOADED_BADGE_MS;
    cachedLoadedBadgeTimeoutRef.current = window.setTimeout(() => {
      setCachedPoisLoadedBadgeVisible(false);
      cachedLoadedBadgeTimeoutRef.current = null;
    }, ms);
  }, [prefersReducedMotion]);

  const { data: mapPrefs } = useQuery({
    queryKey: ["map-provider-settings"],
    queryFn: loadMapSettings,
    staleTime: 5 * 60 * 1000,
  });

  const mapProvider = mapPrefs?.map_provider ?? "osm";
  const googleApiKeyForTiles = mapPrefs?.google_maps_api_key ?? null;

  // Load persisted fetch coverage (v2 JSON only; legacy Map blobs ignored)
  useEffect(() => {
    try {
      fetchedCoverageRef.current = parseOpenmapPoiCoverageFromLs(localStorage.getItem(OPENMAP_POI_LS_KEY));
    } catch (e) {
      console.warn("Failed to load POI coverage cache", e);
      fetchedCoverageRef.current = [];
    }
  }, []);

  // Auto-load: localStorage first paint; DB rows override when loaded
  useEffect(() => {
    const saved = localStorage.getItem("openmap_autoLoadPois");
    setAutoLoadPois(saved !== null ? saved === "true" : true);
  }, []);

  useEffect(() => {
    const row = openmapPreferenceRows.find((r) => r.key === "openmap_auto_load_pois");
    if (row === undefined) return;
    const v = row.value;
    if (v === true || v === "true" || v === 1 || v === "1") {
      setAutoLoadPois(true);
    } else if (v === false || v === "false" || v === 0 || v === "0") {
      setAutoLoadPois(false);
    }
  }, [openmapPreferenceRows]);

  // Settings listener (localStorage mirror + refetch DB-backed OpenMap prefs)
  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: ["openmap-user-preferences"] });
      const saved = localStorage.getItem("openmap_autoLoadPois");
      setAutoLoadPois(saved !== null ? saved === "true" : true);
    };
    window.addEventListener("openmap-settings-changed", handler);
    return () => window.removeEventListener("openmap-settings-changed", handler);
  }, [queryClient]);

  // Company import refresh
  const refreshCompanies = useCallback(async () => {
    const supabase = (await import("@/lib/supabase/browser")).createClient();

    let query = supabase
      .from("companies")
      .select("*")
      .is("deleted_at", null)
      .not("lat", "is", null)
      .not("lon", "is", null);

    query = query.order("firmenname", { ascending: true });

    const { data, error } = await query;
    if (error) {
      console.error("Failed to refresh companies:", error);
      return;
    }

    setCompanies(data || []);
  }, []);

  useEffect(() => {
    const handler = () => {
      refreshCompanies();
    };
    window.addEventListener("company-imported", handler);
    return () => window.removeEventListener("company-imported", handler);
  }, [refreshCompanies]);

  // Persist fetch coverage on unmount (POIs stay in memory only)
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (poiEnterClearTimeoutRef.current !== null) clearTimeout(poiEnterClearTimeoutRef.current);
      if (cachedLoadedBadgeTimeoutRef.current !== null) clearTimeout(cachedLoadedBadgeTimeoutRef.current);
      const payload: OsmPoiPersistedCacheV2 = { v: 2, coverage: [...fetchedCoverageRef.current] };
      localStorage.setItem(OPENMAP_POI_LS_KEY, JSON.stringify(payload));
    };
  }, []);

  // Leaflet icon fix
  useEffect(() => {
    if (typeof window === "undefined") return;
    // @ts-expect-error
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
    });
    setMounted(true);
  }, []);

  // Dark mode
  useEffect(() => {
    const update = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mapProvider === "google") return;
    setGoogleSession(null);
    toast.dismiss("google-map-tiles-session");
  }, [mapProvider]);

  useEffect(() => {
    if (mapProvider !== "google") return;

    const trimmed = googleApiKeyForTiles?.trim();
    if (!trimmed) {
      setGoogleSession(null);
      toast.error(t("googleNoApiKeyTitle"), {
        id: "google-map-tiles-session",
        description: t("googleNoApiKeyDescription"),
      });
      return;
    }

    const cacheKey = `${trimmed}\u0000${isDarkMode ? "dark" : "light"}`;
    const cached = googleTilesCacheRef.current;
    if (cached !== null && cached.cacheKey === cacheKey) {
      setGoogleSession(cached.session);
      toast.dismiss("google-map-tiles-session");
    } else {
      googleSessionRequestEpochRef.current += 1;
      const requestEpoch = googleSessionRequestEpochRef.current;

      void createGoogleMapTilesSession(trimmed, { isDarkMode }).then((result) => {
        if (googleSessionRequestEpochRef.current !== requestEpoch) return;
        if (result.success) {
          googleTilesCacheRef.current = { cacheKey, session: result.session };
          setGoogleSession(result.session);
          toast.dismiss("google-map-tiles-session");
          return;
        }
        setGoogleSession(null);
        const description =
          result.error === "network"
            ? t("googleSessionErrorNetwork")
            : result.error === "http"
              ? t("googleSessionErrorHttp")
              : t("googleSessionErrorUnexpected");
        toast.error(t("googleSessionFailedTitle"), {
          id: "google-map-tiles-session",
          description,
        });
      });
    }

    return () => {
      googleSessionRequestEpochRef.current += 1;
    };
  }, [mapProvider, googleApiKeyForTiles, isDarkMode, t]);

  // Initial view: deep-link from URL, otherwise zoom to fit all CRM company markers once
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const zoom = searchParams.get("zoom");

    if (lat && lon) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      const zoomNum = zoom ? parseInt(zoom, 10) : 15;

      if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
        mapRef.current.setView([latNum, lonNum], zoomNum);
        didInitialCompanyFitRef.current = true;
      } else if (!didInitialCompanyFitRef.current) {
        fitMapToCompanyLatLngs(mapRef.current, collectCompanyLatLngs(companies));
        didInitialCompanyFitRef.current = true;
      }
    } else if (!didInitialCompanyFitRef.current) {
      fitMapToCompanyLatLngs(mapRef.current, collectCompanyLatLngs(companies));
      didInitialCompanyFitRef.current = true;
    }

    setHasCentered(true);
  }, [mapReady, searchParams, companies]);

  // Main POI load: never clears `osmPois` until a successful merge in `.then`; prune only after merge if over cap.
  const handleLoad = useCallback(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const zoom = map.getZoom();
    setCurrentZoom(zoom);

    const prefs = openmapPrefsResolved;
    if (!prefs.autoLoadPois || zoom < 13) return;

    const bounds = map.getBounds();
    const now = Date.now();

    const forceFetch = forceViewportOsmFetchRef.current;
    if (forceFetch) {
      forceViewportOsmFetchRef.current = false;
    }

    if (
      !forceFetch &&
      viewportFullyCoveredByAny(
        bounds,
        fetchedCoverageRef.current,
        now,
        prefs.cacheTtlMs,
        prefs.coverageInflateRatio,
      )
    ) {
      showCachedLoadedBadge();
      return;
    }

    setCachedPoisLoadedBadgeVisible(false);
    const epoch = ++fetchEpochRef.current;
    setLoadingOsm(true);

    fetchOsmPois(bounds)
      .then((result) => {
        if (fetchEpochRef.current !== epoch) return;

        const incoming = (result.pois ?? []) as OsmPoi[];
        const prevSnapshot = osmPoisRef.current;

        fetchedCoverageRef.current.push(boundsToCoverageEntry(bounds, now));
        while (fetchedCoverageRef.current.length > MAX_OSM_FETCH_COVERAGE_ENTRIES) {
          fetchedCoverageRef.current.shift();
        }

        const maxPois = prefs.maxPoisInMemory;
        setOsmPois((prev) => {
          const merged = mergeOsmPoisPreferIncoming(prev, incoming);
          if (merged.length <= maxPois) {
            return merged;
          }
          return pruneOsmPoisFarFromView(merged, bounds, OSM_PRUNE_PAD_RATIO);
        });

        armPoiEnterAnimation(incoming, prevSnapshot);

        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          const payload: OsmPoiPersistedCacheV2 = { v: 2, coverage: [...fetchedCoverageRef.current] };
          localStorage.setItem(OPENMAP_POI_LS_KEY, JSON.stringify(payload));
        }, 3000);
      })
      .catch((err) => console.error("POI load error:", err))
      .finally(() => {
        if (fetchEpochRef.current === epoch) {
          setLoadingOsm(false);
        }
      });
  }, [armPoiEnterAnimation, openmapPrefsResolved, showCachedLoadedBadge]);

  const handleRefreshVisibleArea = useCallback(() => {
    const map = mapRef.current;
    if (!map || map.getZoom() < 13) return;
    forceViewportOsmFetchRef.current = true;
    setCachedPoisLoadedBadgeVisible(false);
    handleLoad();
  }, [handleLoad]);

  // Debounced map events
  const debounced = useCallback(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(handleLoad, 800);
  }, [handleLoad]);

  // Initial load
  useEffect(() => {
    if (!mapReady || !hasCentered) return;
    const timer = setTimeout(handleLoad, 800);
    return () => clearTimeout(timer);
  }, [mapReady, hasCentered, handleLoad]);

  const basemap = useMemo(
    () =>
      resolveBasemap({
        provider: mapProvider,
        isDark: isDarkMode,
        googleSessionId: googleSession,
        googleApiKey: googleApiKeyForTiles,
      }),
    [mapProvider, isDarkMode, googleSession, googleApiKeyForTiles],
  );

  const validCompanies = useMemo(() => {
    return companies.filter((c) => {
      const lat = toFiniteLatLon(c.lat);
      const lon = toFiniteLatLon(c.lon);
      return lat !== null && lon !== null && isWgs84Degrees(lat, lon);
    });
  }, [companies]);

  const resetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    fitMapToCompanyLatLngs(map, collectCompanyLatLngs(validCompanies));
  }, [validCompanies]);

  const handleImportOsmPoi = useCallback(
    async (poi: OsmPoi) => {
      await importOsmPoi(poi);
    },
    [importOsmPoi],
  );

  const osmMarkers = useMemo(
    () =>
      osmPois.flatMap((poi) => {
        const pos = osmPoiPosition(poi);
        if (pos === null) return [];
        return [
          <Marker
            key={`osm-${osmPoiDedupeKey(poi)}`}
            position={pos}
            icon={getOsmPoiIcon(isDarkMode, osmPoiEnterKeys.has(osmPoiDedupeKey(poi)))}
          >
            <Popup>
              <OsmPoiMarkerPopup
                poi={poi}
                isDarkMode={isDarkMode}
                onImport={handleImportOsmPoi}
                onViewInOsm={viewInOsm}
                onCalculateWater={async (poiInner) => {
                  await calculateWaterForPoi(poiInner);
                  const key = osmPoiDedupeKey(poiInner);
                  setOsmPois((prev) =>
                    prev.map((p) => (osmPoiDedupeKey(p) === key ? { ...p, ...poiInner } : p)),
                  );
                }}
              />
            </Popup>
          </Marker>,
        ];
      }),
    [osmPois, osmPoiEnterKeys, isDarkMode, handleImportOsmPoi, viewInOsm, calculateWaterForPoi],
  );

  if (!mounted) {
    return <OpenMapViewSkeleton />;
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <OpenMapLeafletCore
        mapRef={mapRef}
        isDarkMode={isDarkMode}
        basemap={basemap}
        validCompanies={validCompanies}
        osmMarkers={osmMarkers}
        onBoundsDebounced={debounced}
        onShellReady={handleMapShellReady}
        onOpenCompanyDetail={stableOpenCompanyDetail}
      />

      {basemap.showAppleBasemapNotice && (
        <div
          className="absolute top-14 left-1/2 z-[1000] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-md border bg-card/90 px-2.5 py-1 text-center text-[11px] leading-snug text-muted-foreground shadow-sm backdrop-blur"
          role="status"
        >
          {t("appleBasemapNotice")}
        </div>
      )}

      {/* POI count + cached-from-cache badge (badge sits below chip, auto-dismiss) */}
      {currentZoom >= 13 && (
        <div className="absolute top-4 left-4 z-[1000] flex max-w-[min(92vw,20rem)] flex-col gap-1.5">
          <div className="rounded-md border bg-card/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t("poiCount", { count: osmPois.length })}</span>
            </div>
            {loadingOsm ? (
              <div className="mt-1 flex items-center gap-2 border-t border-border/60 pt-1 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                <span>{t("loadingNewPois")}</span>
              </div>
            ) : null}
          </div>
          {cachedPoisLoadedBadgeVisible && !loadingOsm ? (
            <div
              role="status"
              className={cn(
                "rounded-md border border-border bg-card/90 px-2.5 py-1 text-xs leading-snug text-muted-foreground shadow-sm backdrop-blur",
                !prefersReducedMotion && "animate-in fade-in duration-150",
              )}
            >
              {t("cachedPoisLoaded")}
            </div>
          ) : null}
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          className="bg-card border shadow-md"
          title={t("titleFitAllCompanies")}
          type="button"
        >
          <Building className="h-4 w-4 text-foreground" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          disabled={currentZoom < 13}
          onClick={() => {
            handleRefreshVisibleArea();
          }}
          className="bg-card border shadow-md"
          title={t("titleRefreshVisibleArea")}
          type="button"
        >
          <RefreshCw className="h-4 w-4 text-foreground" />
        </Button>

        <Button
          variant={showLegend ? "default" : "secondary"}
          size="icon"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-card border shadow-md"
          type="button"
        >
          <Info className="h-4 w-4 text-foreground" />
        </Button>
      </div>

      {showLegend && (
        <div className="absolute top-28 right-4 z-[1000] bg-card border p-4 rounded-lg shadow-md text-sm max-w-[220px]">
          <div className="font-medium mb-3 flex items-center justify-between">
            {t("legendTitle")}
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {Object.keys(statusLabels).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: statusColors[key] || "#6b7280" }} />
                <span>{t(getOpenmapStatusMsgKey(key))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
