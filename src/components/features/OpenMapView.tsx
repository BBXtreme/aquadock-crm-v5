"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";

import { Info, Loader2, MapPin, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors, statusLabels } from "@/lib/constants/status-colors";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";

export default function OpenMapView({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleLoad = () => {
      const map = mapRef.current;
      if (!map) return;
      const zoom = map.getZoom();
      if (zoom >= 12) {
        setLoadingOsm(true);
        fetchOsmPois(map.getBounds()).then(result => {
          setOsmPois(result.pois || []);
        }).catch(err => console.error("POI load error:", err)).finally(() => setLoadingOsm(false));
      }
    };

    // Initial load with delay
    setTimeout(() => {
      handleLoad();
    }, 1200);

    map.on("zoomend", handleLoad);
    map.on("moveend", handleLoad);

    return () => {
      map.off("zoomend", handleLoad);
      map.off("moveend", handleLoad);
    };
  }, []);

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

        <MarkerClusterGroup chunkedLoading maxClusterRadius={100}>
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
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={async () => {
            const map = mapRef.current;
            if (!map) return;
            setLoadingOsm(true);
            try {
              const result = await fetchOsmPois(map.getBounds());
              setOsmPois(result.pois || []);
              toast.success(`Loaded ${result.totalFound || 0} POIs`);
            } catch (err) {
              toast.error("Failed to load POIs");
            } finally {
              setLoadingOsm(false);
            }
          }}
          className="bg-card border shadow-md text-foreground"
        >
          {loadingOsm ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>
        <Button
          variant={showLegend ? "default" : "secondary"}
          size="icon"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-card border shadow-md text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-center w-10 h-10">
          {loadingOsm ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <MapPin className="h-5 w-5 text-muted-foreground" />}
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
