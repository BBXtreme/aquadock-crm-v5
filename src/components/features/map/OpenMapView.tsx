// src/components/features/map/OpenMapView.tsx
// This component renders the main map view using Leaflet, showing company markers and OSM POIs.
// It includes logic for fetching POIs based on map bounds with caching, handling marker popups, and user interactions.

"use client";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";

import "leaflet/dist/leaflet.css";

import { Building, Info, Loader2, MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CompanyForOpenMap } from "@/lib/actions/companies";
import { statusColors, statusLabels } from "@/lib/constants/map-status-colors";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map-utils";

import CompanyMarkerPopup from "./CompanyMarkerPopup";
import OsmPoiMarkerPopup from "./OsmPoiMarkerPopup";
import type { OsmPoi } from "./types";
import { useMapPopupActions } from "./useMapPopupActions";

interface CacheEntry {
  pois: OsmPoi[];
  timestamp: number;
  bounds: L.LatLngBounds;
}

const MapEventHandler = ({ onBoundsChange }: { onBoundsChange: () => void }) => {
  useMapEvents({
    moveend: onBoundsChange,
    zoomend: onBoundsChange,
  });
  return null;
};

export default function OpenMapView({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<OsmPoi[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const osmCacheRef = useRef(new Map<string, CacheEntry>());
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [autoLoadPois, setAutoLoadPois] = useState(true);
  const [companies, setCompanies] = useState<CompanyForOpenMap[]>(initialCompanies);

  const { openCompanyDetail, importOsmPoi, viewInOsm, calculateWaterForPoi } = useMapPopupActions();

  // Load POI cache from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("openmap-poi-cache");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        osmCacheRef.current = new Map(Object.entries(parsed));
      } catch (e) {
        console.warn("Failed to load POI cache", e);
      }
    }
  }, []);

  // Auto-load setting
  useEffect(() => {
    const saved = localStorage.getItem("openmap_autoLoadPois");
    setAutoLoadPois(saved !== null ? saved === "true" : true);
  }, []);

  // Settings listener
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem("openmap_autoLoadPois");
      setAutoLoadPois(saved !== null ? saved === "true" : true);
    };
    window.addEventListener("openmap-settings-changed", handler);
    return () => window.removeEventListener("openmap-settings-changed", handler);
  }, []);

  // Company import refresh
  const refreshCompanies = useCallback(async () => {
    const supabase = (await import("@/lib/supabase/browser")).createClient();

    let query = supabase.from("companies").select("*").not("lat", "is", null).not("lon", "is", null);

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

  // Save cache on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      const cacheObj = Object.fromEntries(osmCacheRef.current);
      localStorage.setItem("openmap-poi-cache", JSON.stringify(cacheObj));
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

  // Main POI load handler with debounce
  const handleLoad = useCallback(() => {
    if (!mapRef.current) return;

    const zoom = mapRef.current.getZoom();
    setCurrentZoom(zoom);

    if (!autoLoadPois || zoom < 13) return;

    const bounds = mapRef.current.getBounds();
    const centerLat = Math.round(bounds.getCenter().lat * 2) / 2;
    const centerLon = Math.round(bounds.getCenter().lng * 2) / 2;
    const key = `${zoom}-${centerLat},${centerLon}`;

    const now = Date.now();
    const cacheEntry = osmCacheRef.current.get(key);

    if (cacheEntry && now - cacheEntry.timestamp < 10 * 60 * 1000 && cacheEntry.bounds.contains(bounds)) {
      setOsmPois(cacheEntry.pois);
      return;
    }

    setLoadingOsm(true);

    fetchOsmPois(bounds)
      .then((result) => {
        const pois: OsmPoi[] = (result.pois || []) as OsmPoi[];
        osmCacheRef.current.set(key, { pois, timestamp: now, bounds });

        if (osmCacheRef.current.size > 15) {
          const firstKey = osmCacheRef.current.keys().next().value;
          if (firstKey) osmCacheRef.current.delete(firstKey);
        }

        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          const cacheObj = Object.fromEntries(osmCacheRef.current);
          localStorage.setItem("openmap-poi-cache", JSON.stringify(cacheObj));
        }, 3000);

        setOsmPois(pois);
      })
      .catch((err) => console.error("POI load error:", err))
      .finally(() => setLoadingOsm(false));
  }, [autoLoadPois]);

  // Debounced map events
  const debounced = useCallback(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(handleLoad, 800);
  }, [handleLoad]);

  // Initial load
  useEffect(() => {
    if (!mapReady) return;
    const timer = setTimeout(handleLoad, 800);
    return () => clearTimeout(timer);
  }, [mapReady, handleLoad]);

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`;

  const validCompanies = useMemo(
    () => companies.filter((c) => typeof c.lat === "number" && typeof c.lon === "number"),
    [companies],
  );

  const resetView = () => {
    if (mapRef.current && validCompanies.length > 0) {
      const bounds = L.latLngBounds(validCompanies.map((c) => [c.lat ?? 0, c.lon ?? 0]));
      mapRef.current.fitBounds(bounds, { padding: [80, 80] });
    } else if (mapRef.current) {
      mapRef.current.flyTo([51.1657, 10.4515], 7);
    }
  };

  const handleImportOsmPoi = useCallback(
    async (poi: OsmPoi) => {
      await importOsmPoi(poi);
    },
    [importOsmPoi],
  );

  const osmMarkers = useMemo(
    () =>
      osmPois
        .filter((poi) => {
          const lat = poi.lat || poi.center?.lat;
          const lon = poi.lon || poi.center?.lon;
          return typeof lat === "number" && typeof lon === "number" && !Number.isNaN(lat) && !Number.isNaN(lon);
        })
        .map((poi) => {
          const lat = poi.lat || poi.center?.lat;
          const lon = poi.lon || poi.center?.lon;
          return (
            <Marker
              key={`osm-${poi.type}-${poi.id}`}
              position={[lat as number, lon as number]}
              icon={getOsmPoiIcon(isDarkMode)}
            >
              <Popup>
                <OsmPoiMarkerPopup
                  poi={poi}
                  isDarkMode={isDarkMode}
                  onImport={handleImportOsmPoi}
                  onViewInOsm={viewInOsm}
                  onCalculateWater={async (poi) => {
                    await calculateWaterForPoi(poi);
                    setOsmPois((prev) =>
                      prev.map((p) => (p.id === poi.id && p.type === poi.type ? { ...p, ...poi } : p)),
                    );
                  }}
                />
              </Popup>
            </Marker>
          );
        }),
    [osmPois, isDarkMode, handleImportOsmPoi, viewInOsm, calculateWaterForPoi],
  );

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <MapContainer
        ref={mapRef}
        center={[50.1109, 8.6821]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        whenReady={() => setMapReady(true)}
        preferCanvas={true}
      >
        <TileLayer attribution={attribution} url={tileUrl} />

        {/* Company Markers */}
        {validCompanies.map((company) => (
          <Marker key={company.id} position={[company.lat ?? 0, company.lon ?? 0]} icon={getStatusIcon(company.status)}>
            <Popup>
              <CompanyMarkerPopup company={company} onOpenDetail={openCompanyDetail} />
            </Popup>
          </Marker>
        ))}

        <MapEventHandler onBoundsChange={debounced} />

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          removeOutsideVisibleBounds={false}
          animateAddingMarkers={false}
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

      {/* POI Count */}
      {currentZoom >= 13 && (
        <div className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur border rounded-md px-3 py-1.5 text-sm text-muted-foreground flex items-center gap-2 shadow-sm">
          {loadingOsm ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading POIs...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              {osmPois.length} OSM POIs
            </>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          className="bg-card border shadow-md"
          title="Alle Firmen anzeigen"
          type="button"
        >
          <Building className="h-4 w-4 text-foreground" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          disabled={currentZoom < 13}
          onClick={async () => {
            osmCacheRef.current.clear();
            localStorage.removeItem("openmap-poi-cache");
            if (mapRef.current && mapRef.current.getZoom() >= 13) {
              setLoadingOsm(true);
              try {
                const result = await fetchOsmPois(mapRef.current.getBounds());
                setOsmPois((result.pois || []) as OsmPoi[]);
              } catch (e) {
                console.error(e);
              } finally {
                setLoadingOsm(false);
              }
            }
          }}
          className="bg-card border shadow-md"
          title="Cache leeren und POIs neu laden"
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
            Status Legende
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(statusLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: statusColors[key] || "#6b7280" }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
