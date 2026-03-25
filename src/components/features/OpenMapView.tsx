"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";

import "leaflet/dist/leaflet.css";

import { Building, Info, Loader2, MapPin, RefreshCw, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { statusColors, statusLabels } from "@/lib/constants/map-status-colors";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";

// ✅ Correct imports from the map/ subfolder
import CompanyMarkerPopup from "./map/CompanyMarkerPopup";
import OsmPoiMarkerPopup from "./map/OsmPoiMarkerPopup";
import type { OsmPoi } from "./map/types";
import { useMapPopupActions } from "./map/useMapPopupActions";

interface CacheEntry {
  pois: OsmPoi[];
  timestamp: number;
}

export default function OpenMapView({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<OsmPoi[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const poiCache = useRef(new Map<string, CacheEntry>());
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const debouncedHandleLoadRef = useRef<() => void>();
  const [autoLoadPois, setAutoLoadPois] = useState(true);
  const [companies, setCompanies] = useState<CompanyForOpenMap[]>(initialCompanies);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { openCompanyDetail, importOsmPoi, viewInOsm } = useMapPopupActions();

  // Load POI cache from localStorage on mount
  useEffect(() => {
    const savedCache = localStorage.getItem("openmap-poi-cache");
    if (savedCache) {
      try {
        const parsed = JSON.parse(savedCache);
        poiCache.current = new Map(Object.entries(parsed));
      } catch (e) {
        console.warn("Failed to load POI cache from localStorage:", e);
      }
    }
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("openmap_autoLoadPois");
    setAutoLoadPois(saved !== null ? saved === "true" : true);
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem("openmap_autoLoadPois");
      setAutoLoadPois(saved !== null ? saved === "true" : true);
    };

    window.addEventListener("openmap-settings-changed", handleSettingsChange);
    return () => window.removeEventListener("openmap-settings-changed", handleSettingsChange);
  }, []);

  // Listen for company import events to refresh company markers
  useEffect(() => {
    const handleCompanyImported = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener("company-imported", handleCompanyImported);
    return () => window.removeEventListener("company-imported", handleCompanyImported);
  }, []);

  // Refresh companies when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger === 0) return; // Skip initial render

    const fetchCompanies = async () => {
      const supabase = (await import("@/lib/supabase/browser")).createClient();
      const isDevelopment = process.env.NODE_ENV === "development";
      const isMockUser = true; // No auth in development

      let query = supabase
        .from("companies")
        .select("id, firmenname, kundentyp, status, lat, lon, stadt, land, value, osm, telefon, website")
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
    };

    fetchCompanies();
  }, [refreshTrigger]);

  // Safe Leaflet icon fix
  useEffect(() => {
    if (typeof window === "undefined") return;
    delete (L.Icon.Default.prototype as any)._getIconUrl;
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
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Define handleLoad as useCallback at top level
  const handleLoad = useCallback(() => {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom();
    setCurrentZoom(zoom);
    if (!autoLoadPois || zoom < 13) return;

    const bounds = mapRef.current.getBounds();
    const centerLat = Math.round(bounds.getCenter().lat * 2) / 2;
    const centerLon = Math.round(bounds.getCenter().lng * 2) / 2;
    const key = `${centerLat},${centerLon}`;

    const now = Date.now();
    const cacheEntry = poiCache.current.get(key);
    if (cacheEntry && now - cacheEntry.timestamp < 10 * 60 * 1000) {
      setOsmPois(cacheEntry.pois);
      return;
    }

    setLoadingOsm(true);
    fetchOsmPois(bounds)
      .then(async (result) => {
        const pois: OsmPoi[] = result.pois || [];
        const newEntry = { pois, timestamp: now };
        poiCache.current.set(key, newEntry);

        // Save to localStorage
        const cacheObj = Object.fromEntries(poiCache.current);
        localStorage.setItem("openmap-poi-cache", JSON.stringify(cacheObj));

        if (poiCache.current.size > 30) {
          const firstKey = poiCache.current.keys().next().value;
          poiCache.current.delete(firstKey);
        }

        setOsmPois(pois);
      })
      .catch((err) => console.error("POI load error:", err))
      .finally(() => setLoadingOsm(false));
  }, [autoLoadPois]);

  // Set up map event listeners when map is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    debouncedHandleLoadRef.current = () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(handleLoad, 500);
    };

    mapRef.current.on("zoomend", debouncedHandleLoadRef.current);
    mapRef.current.on("moveend", debouncedHandleLoadRef.current);

    return () => {
      if (mapRef.current && debouncedHandleLoadRef.current) {
        mapRef.current.off("zoomend", debouncedHandleLoadRef.current);
        mapRef.current.off("moveend", debouncedHandleLoadRef.current);
      }
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [mapReady, handleLoad]);

  // Initial load after map is ready with small delay
  useEffect(() => {
    if (!mapReady) return;

    const timer = setTimeout(() => {
      handleLoad();
    }, 1000);

    return () => clearTimeout(timer);
  }, [mapReady, handleLoad]);

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`;

  const validCompanies = useMemo(
    () => (companies || []).filter((c) => typeof c.lat === "number" && typeof c.lon === "number"),
    [companies],
  );

  const resetView = () => {
    if (mapRef.current && validCompanies.length > 0) {
      const bounds = L.latLngBounds(validCompanies.map((c) => [c.lat!, c.lon!]));
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

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={120}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            if (count <= 10) {
              // For small clusters, don't show cluster icon - markers remain individual
              return L.divIcon({
                html: "",
                className: "empty-cluster",
                iconSize: [0, 0],
              });
            } else {
              // For larger clusters, show count and enable spiderfy
              return L.divIcon({
                html: `<div style="background-color:${isDarkMode ? "#374151" : "white"};color:${isDarkMode ? "white" : "#374151"};width:40px;height:40px;border-radius:50%;border:3px solid ${isDarkMode ? "#9ca3af" : "#d1d5db"};box-shadow:0 3px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">${count}</div>`,
                className: "cluster-icon",
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              });
            }
          }}
          polygonOptions={{
            color: isDarkMode ? "#4b5563" : "#9ca3af",
            weight: 2,
            opacity: 0.6,
            fillOpacity: 0.15,
          }}
        >
          {/* CRM Company Markers */}
          {validCompanies.map((company) => (
            <Marker key={company.id} position={[company.lat!, company.lon!]} icon={getStatusIcon(company.status)}>
              <Popup>
                <CompanyMarkerPopup company={company} onOpenDetail={openCompanyDetail} />
              </Popup>
            </Marker>
          ))}

          {/* OSM POI Markers */}
          {osmPois.map((poi) => {
            const posLat = poi.lat || poi.center?.lat;
            const posLon = poi.lon || poi.center?.lon;
            if (!posLat || !posLon || isNaN(posLat) || isNaN(posLon)) return null;

            return (
              <Marker key={`${poi.type}-${poi.id}`} position={[posLat, posLon]} icon={getOsmPoiIcon(isDarkMode)}>
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

      {/* POI Count Badge */}
      {(currentZoom >= 13 || loadingOsm) && (
        <div className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border rounded-md shadow-sm px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
          {loadingOsm ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              {osmPois.length} OSM POIs visible
            </>
          )}
        </div>
      )}

      {/* Floating Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          className="bg-card border shadow-md text-foreground"
          title="Alle Firmen anzeigen"
        >
          <Building className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={async () => {
            poiCache.current.clear();
            localStorage.removeItem("openmap-poi-cache");
            const map = mapRef.current;
            if (map && map.getZoom() >= 13) {
              setLoadingOsm(true);
              try {
                const result = await fetchOsmPois(map.getBounds());
                setOsmPois(result.pois || []);
              } catch (e) {
                console.error("POI reload error:", e);
              } finally {
                setLoadingOsm(false);
              }
            }
          }}
          className="bg-card border shadow-md text-foreground"
          title="Cache leeren und POIs neu laden"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button
          variant={showLegend ? "default" : "secondary"}
          size="icon"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-card border shadow-md text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
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
