"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, MapPin, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";
import { statusColors, statusLabels } from "@/lib/constants/status-colors";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const MapWithNoSSR = dynamic(
  () => import("./OpenMapClientInner"),
  { ssr: false }
);

type OpenMapProps = {
  initialCompanies: CompanyForOpenMap[];
  error?: string | null;
};

export function OpenMapClient({ initialCompanies, error }: OpenMapProps) {
  const mapRef = useRef<any>(null);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const queryClient = useQueryClient();

  // Safe Leaflet icon fix - only on client
  useEffect(() => {
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });
    });
  }, []);

  const importMutation = useMutation({
    mutationFn: (poi: any) => importOsmPoi(poi),
    onSuccess: (newCompany, poi) => {
      toast.success(`"${newCompany.firmenname}" erfolgreich importiert`);
      queryClient.invalidateQueries({ queryKey: ["companiesForMap"] });
      setOsmPois((prev) => prev.filter((p) => p.id !== poi.id));
    },
    onError: (err: any) => toast.error("Import fehlgeschlagen", { description: err.message }),
  });

  const loadOsmPois = async () => {
    if (!mapRef.current) return;
    setLoadingOsm(true);
    try {
      const bounds = mapRef.current.getBounds();
      const pois = await fetchOsmPois(bounds);
      setOsmPois(pois);
      toast.success(`${pois.length} OSM-POIs geladen`);
    } catch (err) {
      toast.error("OSM-POIs konnten nicht geladen werden");
      console.error("[OpenMap OSM]", err);
    } finally {
      setLoadingOsm(false);
    }
  };

  useEffect(() => {
    if (showOsm) loadOsmPois();
  }, [showOsm]);

  const resetView = () => {
    if (mapRef.current && initialCompanies.length > 0) {
      const validCoords = initialCompanies
        .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
        .map((c) => [c.lat!, c.lon!] as [number, number]);
      if (validCoords.length > 0) {
        const bounds = (window as any).L.latLngBounds(validCoords);
        mapRef.current.fitBounds(bounds, { padding: [80, 80] });
      }
    }
  };

  const validCompanies = useMemo(() => {
    return initialCompanies.filter((c) => typeof c.lat === "number" && typeof c.lon === "number");
  }, [initialCompanies]);

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    updateDarkMode();

    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`;

  const handleImportPoi = (poi: any) => {
    importMutation.mutate(poi);
  };

  // Geocoding function (Nominatim - free & respectful)
  const handleGeocode = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        mapRef.current.flyTo([parseFloat(lat), parseFloat(lon)], 15, { duration: 1.5 });
        toast.success(`Gefunden: ${display_name}`);
      } else {
        toast.error("Keine Ergebnisse gefunden");
      }
    } catch (err) {
      toast.error("Geocoding fehlgeschlagen");
    } finally {
      setIsSearching(false);
    }
  };

  // Theme change handling
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        resetView();
      }, 150);
    }
  }, [isDarkMode, initialCompanies]);

  // Legend items using centralized data
  const legendItems = Object.entries(statusLabels).map(([key, label]) => ({
    key,
    label,
    color: statusColors[key] || "#6b7280",
  }));

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/40">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">Fehler beim Laden der Karte</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative h-full w-full">
        {/* Search Bar */}
        <div className="absolute top-4 left-4 z-[1001] w-80">
          <div className="relative flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGeocode()}
              placeholder="Adresse suchen (z.B. Hamburg Hafen)"
              className="bg-background/95 backdrop-blur-sm border shadow-md"
            />
            <Button onClick={handleGeocode} disabled={isSearching} size="icon" className="bg-card border shadow-md">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <MapWithNoSSR
          initialCompanies={initialCompanies}
          showOsm={showOsm}
          osmPois={osmPois}
          onImportPoi={handleImportPoi}
          isDarkMode={isDarkMode}
          tileUrl={tileUrl}
          attribution={attribution}
          getOsmPoiIcon={getOsmPoiIcon}
          mapRef={mapRef}
        />

        {/* OSM Loading Overlay */}
        {loadingOsm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-1000">
            <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-md">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-center">Loading OSM POIs...</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {showLegend && (
          <div className="absolute top-20 right-4 z-101 bg-background/95 backdrop-blur-sm border rounded-xl p-4 shadow-xl min-w-0">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Status Legende
            </h4>
            <div className="space-y-2 text-sm">
              {legendItems.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={resetView}
            className="bg-card border shadow-md hover:bg-card text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant={showOsm ? "default" : "secondary"}
            size="icon"
            onClick={() => setShowOsm(!showOsm)}
            disabled={loadingOsm}
            className="bg-card border shadow-md hover:bg-card text-foreground"
          >
            {loadingOsm ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          </Button>

          <Button
            variant={showLegend ? "default" : "secondary"}
            size="icon"
            onClick={() => setShowLegend(!showLegend)}
            className="bg-card border shadow-md hover:bg-card text-foreground"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {validCompanies.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <div className="text-center">
              <p className="text-lg font-medium">Keine Firmen mit Geodaten gefunden</p>
              <p className="text-sm text-muted-foreground">Firmen mit Breiten- und Längengrad werden hier angezeigt.</p>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
