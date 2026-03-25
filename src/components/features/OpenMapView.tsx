"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";

import { Building, Info, Loader2, MapPin, Plus, RefreshCw, Search, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors, statusLabels } from "@/lib/constants/map-status-colors";
import { createClient } from "@/lib/supabase/browser";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { upsertUserSetting } from "@/lib/supabase/services/user-settings";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";

interface CacheEntry {
  pois: any[];
  timestamp: number;
}

export default function OpenMapView({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
  const poiCache = useRef(new Map<string, CacheEntry>());
  const [userId, setUserId] = useState<string | null>(null);
  const [autoLoadPois, setAutoLoadPois] = useState(true);

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

    window.addEventListener('openmap-settings-changed', handleSettingsChange);

    return () => window.removeEventListener('openmap-settings-changed', handleSettingsChange);
  }, []);

  const supabase = createClient();

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

  // Auto POI loading
  useEffect(() => {
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      const handleLoad = () => {
        if (!mapRef.current) return;
        const zoom = mapRef.current.getZoom();
        setCurrentZoom(zoom);
        if (!autoLoadPois || zoom < 13) return;

        // Stable cache key based on center (0.5° = ~56km grid - coarser balance)
        const bounds = mapRef.current.getBounds();
        const centerLat = Math.round(bounds.getCenter().lat * 2) / 2;
        const centerLon = Math.round(bounds.getCenter().lng * 2) / 2;
        const key = `${centerLat},${centerLon}`;

        // Check cache with 10-minute expiration
        const now = Date.now();
        const cacheEntry = poiCache.current.get(key);
        if (cacheEntry && now - cacheEntry.timestamp < 10 * 60 * 1000) {
          setOsmPois(cacheEntry.pois);
          return;
        }

        // Cache miss → fetch new, keep old POIs visible
        setLoadingOsm(true);
        fetchOsmPois(bounds)
          .then(async (result) => {
            const pois = result.pois || [];
            poiCache.current.set(key, { pois, timestamp: now });

            // Simple LRU size limit
            if (poiCache.current.size > 30) {
              const firstKey = poiCache.current.keys().next().value;
              poiCache.current.delete(firstKey);
            }

            setOsmPois(pois);
          })
          .catch((err) => console.error("POI load error:", err))
          .finally(() => setLoadingOsm(false));
      };

      handleLoad(); // initial
      map.on("zoomend", handleLoad);
      map.on("moveend", handleLoad);

      return () => {
        map.off("zoomend", handleLoad);
        map.off("moveend", handleLoad);
      };
    }, 2500);

    return () => clearTimeout(timer);
  }, [autoLoadPois]);

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`;

  const validCompanies = useMemo(
    () => (initialCompanies || []).filter((c) => typeof c.lat === "number" && typeof c.lon === "number"),
    [initialCompanies],
  );

  const resetView = () => {
    if (mapRef.current && validCompanies.length > 0) {
      const bounds = L.latLngBounds(validCompanies.map((c) => [c.lat!, c.lon!]));
      mapRef.current.fitBounds(bounds, { padding: [80, 80] });
    } else if (mapRef.current) {
      mapRef.current.flyTo([51.1657, 10.4515], 7);
    }
  };

  const clearPoiCache = () => {
    poiCache.current.clear();
    setOsmPois([]);
    toast.success("POI cache cleared");
  };

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
      >
        <TileLayer attribution={attribution} url={tileUrl} />

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={120}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          polygonOptions={{
            color: isDarkMode ? '#4b5563' : '#9ca3af',
            weight: 2,
            opacity: 0.6,
            fillOpacity: 0.15,
          }}
        >
          {validCompanies.map((company) => (
            <Marker key={company.id} position={[company.lat!, company.lon!]} icon={getStatusIcon(company.status)}>
              <Popup>
                <div className="min-w-[280px] space-y-3 text-sm">
                  <h3 className="font-semibold">{company.firmenname}</h3>
                  <div className="text-muted-foreground">
                    {company.stadt}, {company.land}
                  </div>
                  {company.value && <div className="font-medium">€{company.value.toLocaleString("de-DE")}</div>}
                </div>
              </Popup>
            </Marker>
          ))}

          {osmPois.map((poi: any) => (
            <Marker
              key={poi.id}
              position={[poi.lat || poi.center?.lat, poi.lon || poi.center?.lon]}
              icon={getOsmPoiIcon(isDarkMode)}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h4 className="font-medium">{poi.tags?.name || "Unbenannter POI"}</h4>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Simple floating controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          className="bg-card border shadow-md text-foreground"
          title="Show all companies on map"
        >
          <Building className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={async () => {
            poiCache.current.clear();
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
          title="Clear cache and reload POIs"
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

        {/* 3-state indicator with tooltip */}
        <div
          className="flex items-center justify-center w-10 h-10 bg-card/80 backdrop-blur-sm border rounded-md shadow-sm relative group"
          title={currentZoom < 13 ? "Zoom in to load nearby POIs" : "POIs loaded"}
        >
          {loadingOsm ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : currentZoom < 13 ? (
            <ZoomIn className="h-5 w-5 text-amber-500" />
          ) : (
            <MapPin className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {showLegend && (
        <div className="absolute top-28 right-4 z-[1000] bg-card border p-4 rounded-lg shadow-md text-sm max-w-[220px]">
          <div className="font-medium mb-3 flex items-center justify-between">
            Status Legende
            <button onClick={() => setShowLegend(false)} className="text-muted-foreground hover:text-foreground">
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
