"use client";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";

import "leaflet/dist/leaflet.css";

import { Building, Info, Loader2, MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { statusColors, statusLabels } from "@/lib/constants/map-status-colors";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";

import CompanyMarkerPopup from "./map/CompanyMarkerPopup";
import OsmPoiMarkerPopup from "./map/OsmPoiMarkerPopup";
import type { OsmPoi } from "./map/types";
import { useMapPopupActions } from "./map/useMapPopupActions";

interface CacheEntry {
  pois: OsmPoi[];
  timestamp: number;
}

export default function OpenMapView({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<OsmPoi[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const poiCache = useRef(new Map<string, CacheEntry>());
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [autoLoadPois, setAutoLoadPois] = useState(true);
  const [companies, setCompanies] = useState<CompanyForOpenMap[]>(initialCompanies);

  const { openCompanyDetail, importOsmPoi, viewInOsm } = useMapPopupActions();

  // Load POI cache from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("openmap-poi-cache");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        poiCache.current = new Map(Object.entries(parsed));
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
    const isDevelopment = process.env.NODE_ENV === "development";
    const isMockUser = true; // No auth in development

    let query = supabase
      .from("companies")
      .select(
        "id, firmenname, kundentyp, status, lat, lon, strasse, plz, stadt, land, value, osm, telefon, website, firmentyp, wassertyp, wasserdistanz",
      )
      .not("lat", "is", null)
      .not("lon", "is", null);

    if (!isDevelopment || !isMockUser) {
      // In production, would filter by user_id
      // query = query.eq("user_id", userId);
    }

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
      const cacheObj = Object.fromEntries(poiCache.current);
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
    const cacheEntry = poiCache.current.get(key);

    if (cacheEntry && now - cacheEntry.timestamp < 10 * 60 * 1000) {
      setOsmPois(cacheEntry.pois);
      return;
    }

    setLoadingOsm(true);

    fetchOsmPois(bounds)
      .then((result) => {
        const pois: OsmPoi[] = result.pois || [];
        poiCache.current.set(key, { pois, timestamp: now });

        // Limit cache size
        if (poiCache.current.size > 15) {
          const firstKey = poiCache.current.keys().next().value;
          poiCache.current.delete(firstKey);
        }

        // Debounced save to localStorage
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          const cacheObj = Object.fromEntries(poiCache.current);
          localStorage.setItem("openmap-poi-cache", JSON.stringify(cacheObj));
        }, 3000);

        setOsmPois(pois);
      })
      .catch((err) => console.error("POI load error:", err))
      .finally(() => setLoadingOsm(false));
  }, [autoLoadPois]);

  // Debounced map events
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const debounced = () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(handleLoad, 500);
    };

    mapRef.current.on("zoomend", debounced);
    mapRef.current.on("moveend", debounced);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("zoomend", debounced);
        mapRef.current.off("moveend", debounced);
      }
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [mapReady, handleLoad]);

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
      >
        <TileLayer attribution={attribution} url={tileUrl} />

        {/* Company Markers - Always visible, separate from clustering */}
        {validCompanies.map((company) => (
          <Marker key={company.id} position={[company.lat ?? 0, company.lon ?? 0]} icon={getStatusIcon(company.status)}>
            <Popup>
              <CompanyMarkerPopup company={company} onOpenDetail={openCompanyDetail} />
            </Popup>
          </Marker>
        ))}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={100}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          iconCreateFunction={(cluster) => {
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
          {/* OSM POI Markers */}
          {osmPois.map((poi) => {
            const lat = poi.lat || poi.center?.lat;
            const lon = poi.lon || poi.center?.lon;
            if (!lat || !lon || Number.isNaN(lat) || Number.isNaN(lon)) return null;

            return (
              <Marker key={`${poi.type}-${poi.id}`} position={[lat, lon]} icon={getOsmPoiIcon(isDarkMode)}>
                <Popup>
                  <OsmPoiMarkerPopup
                    poi={poi}
                    isDarkMode={isDarkMode}
                    onImport={handleImportOsmPoi}
                    onViewInOsm={viewInOsm}
                  />
                </Popup>
              </Marker>
            );
          })}
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
        >
          <Building className="h-4 w-4 text-foreground" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          disabled={currentZoom < 13}
          onClick={async () => {
            poiCache.current.clear();
            localStorage.removeItem("openmap-poi-cache");
            if (mapRef.current && mapRef.current.getZoom() >= 13) {
              setLoadingOsm(true);
              try {
                const result = await fetchOsmPois(mapRef.current.getBounds());
                setOsmPois(result.pois || []);
              } catch (e) {
                console.error(e);
              } finally {
                setLoadingOsm(false);
              }
            }
          }}
          className="bg-card border shadow-md"
          title="Cache leeren und POIs neu laden"
        >
          <RefreshCw className="h-4 w-4 text-foreground" />
        </Button>

        <Button
          variant={showLegend ? "default" : "secondary"}
          size="icon"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-card border shadow-md"
        >
          <Info className="h-4 w-4 text-foreground" />
        </Button>
      </div>

      {showLegend && (
        <div className="absolute top-28 right-4 z-[1000] bg-card border p-4 rounded-lg shadow-md text-sm max-w-[220px]">
          <div className="font-medium mb-3 flex items-center justify-between">
            Status Legende
            <button type="button" onClick={() => setShowLegend(false)} className="text-muted-foreground hover:text-foreground">
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
