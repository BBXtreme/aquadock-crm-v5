"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { useMutation, useQueryClient } from "@tanstack/react-query";
// import "react-leaflet-markercluster/dist/styles.min.css";
import L from "leaflet";
import { Info, Loader2, MapPin, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { fetchOsmPois } from "@/lib/utils/map";

const getStatusIcon = (status?: string) => {
  const colorMap: Record<string, string> = {
    lead: "#808080", // gray
    qualifiziert: "#f59e0b", // orange
    akquise: "#8b5cf6", // violet
    angebot: "#ec4899", // pink
    gewonnen: "#10b981", // emerald
    verloren: "#ef4444", // red
    kunde: "#14b8a6", // teal
    partner: "#6366f1", // indigo
    inaktiv: "#6b7280", // gray
  };

  const color = colorMap[status?.toLowerCase() || "lead"] || "#6b7280";

  return L.divIcon({
    className: "svg-marker",
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="#ffffff" stroke-width="3"/>
        <circle cx="16" cy="16" r="6" fill="#ffffff" />
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

const getOsmPoiIcon = () => {
  return L.divIcon({
    className: "osm-poi",
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#22c55e" stroke="#ffffff" stroke-width="3"/>
        <circle cx="16" cy="16" r="6" fill="#ffffff" />
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

type OpenMapProps = {
  initialCompanies: CompanyForOpenMap[];
  error?: string | null;
};

function MapController({ companies }: { companies: CompanyForOpenMap[] }) {
  const map = useMap();

  useEffect(() => {
    if (companies.length === 0) return;

    const validCoords = companies
      .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
      .map((c) => [c.lat!, c.lon!] as [number, number]);

    if (validCoords.length === 0) return;

    const bounds = L.latLngBounds(validCoords);
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    console.log(`[OpenMap] Auto-fitted to ${validCoords.length} locations`);
  }, [companies, map]);

  useEffect(() => {
    const handleResize = () => setTimeout(() => map.invalidateSize(), 300);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  return null;
}

export function OpenMapClient({ initialCompanies, error }: OpenMapProps) {
  const mapRef = useRef<L.Map>(null);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [showLegend, setShowLegend] = useState(false);

  const queryClient = useQueryClient();

  // Strict client-side Leaflet initialization guard
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Force Leaflet to re-init icons safely on client
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
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
      const bounds = L.latLngBounds(
        initialCompanies
          .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
          .map((c) => [c.lat!, c.lon!]),
      );
      mapRef.current.fitBounds(bounds, { padding: [80, 80] });
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

    // Initial check
    updateDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Carto Dark Matter
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"; // Carto Positron (clean light)

  const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`;

  const handleImportPoi = (poi: any) => {
    importMutation.mutate(poi);
  };

  // Theme change handling
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        // Re-center after theme change
        const bounds = L.latLngBounds(
          initialCompanies
            .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
            .map((c) => [c.lat!, c.lon!]),
        );
        if (bounds.isValid()) mapRef.current?.fitBounds(bounds, { padding: [80, 80] });
      }, 150);
    }
  }, [isDarkMode, initialCompanies]);

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
    <div className="relative h-full w-full">
      <MapContainer
        key={isDarkMode ? "dark" : "light"}
        ref={mapRef}
        center={[51.1657, 10.4515]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer attribution={attribution} url={tileUrl} />

        <MapController companies={initialCompanies} />

        <MarkerClusterGroup chunkedLoading maxClusterRadius={100}>
          {validCompanies.map((company) => (
            <Marker key={company.id} position={[company.lat!, company.lon!]} icon={getStatusIcon(company.status)}>
              <Popup>
                <div className="min-w-[320px] space-y-4 text-sm">
                  <h3 className="font-semibold text-lg">{company.firmenname}</h3>

                  <div className="flex flex-wrap gap-2">
                    {company.kundentyp && (
                      <span className="px-2 py-0.5 bg-muted rounded-full text-xs capitalize">{company.kundentyp}</span>
                    )}
                    {company.status && (
                      <span className="px-2 py-0.5 bg-muted rounded-full text-xs capitalize">{company.status}</span>
                    )}
                  </div>

                  <div className="text-muted-foreground">
                    {company.stadt && <>{company.stadt}, </>}
                    {company.land || "–"}
                  </div>

                  {company.value && (
                    <div className="font-medium">Potenzial: €{company.value.toLocaleString("de-DE")}</div>
                  )}

                  <div className="pt-3 flex flex-wrap gap-2">
                    {company.telefon && (
                      <a
                        href={`tel:${company.telefon}`}
                        className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md"
                      >
                        Anrufen
                      </a>
                    )}
                    {company.website && (
                      <a
                        href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md"
                      >
                        Website
                      </a>
                    )}
                    <Link
                      href={`/companies/${company.id}`}
                      className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 text-accent-foreground rounded-md"
                    >
                      Details öffnen
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {showOsm &&
            osmPois.map((poi: any) => (
              <Marker
                key={poi.id}
                position={[poi.lat || poi.center?.lat, poi.lon || poi.center?.lon]}
                icon={getOsmPoiIcon()}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-2">
                    <h4 className="font-medium">{poi.tags?.name || "Unbenannter POI"}</h4>
                    <p className="text-xs text-muted-foreground">{poi.tags?.amenity || poi.tags?.tourism || "–"}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImportPoi(poi)}
                      disabled={importMutation.isPending}
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {importMutation.isPending ? "Importing..." : "Zu CRM hinzufügen"}
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* OSM Loading Overlay */}
      {loadingOsm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-md">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-center">Loading OSM POIs...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute top-20 right-4 z-[1001] bg-background/95 backdrop-blur-sm border rounded-xl p-4 shadow-xl min-w-[200px]">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Status Legende
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-500 flex-shrink-0" />
              <span>Lead</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0" />
              <span>Qualifiziert</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-violet-500 flex-shrink-0" />
              <span>Akquise</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>Angebot</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0" />
              <span>Gewonnen</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0" />
              <span>Verloren</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-teal-500 flex-shrink-0" />
              <span>Kunde</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-500 flex-shrink-0" />
              <span>Partner</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-zinc-500 flex-shrink-0" />
              <span>Inaktiv</span>
            </div>
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
  );
}
