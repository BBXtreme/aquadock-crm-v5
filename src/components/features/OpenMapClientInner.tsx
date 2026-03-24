"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Info, Loader2, MapPin, Plus, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";
import { statusColors, statusLabels } from "@/lib/constants/status-colors";
import { poiCategories } from "@/lib/constants/map-poi-config";

type PoiCategoryKey = keyof typeof poiCategories;

export default function OpenMapClientInnerComponent({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<L.Map>(null);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [osmError, setOsmError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategories, setActiveCategories] = useState(Object.keys(poiCategories));

  const queryClient = useQueryClient();

  const showError = (message: string, description?: string) => {
    toast.error(message, description ? { description } : undefined);
  };

  // Safe Leaflet icon fix
  useEffect(() => {
    if (typeof window === "undefined") return;
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
    onError: (err: any) => showError("Import fehlgeschlagen", err.message),
  });

  const loadOsmPois = async () => {
    if (!mapRef.current) return;
    setLoadingOsm(true);
    setOsmError(false);
    try {
      const bounds = mapRef.current.getBounds();
      const pois = await fetchOsmPois(bounds, activeCategories);
      setOsmPois(pois);
      toast.success(`${pois.length} OSM-POIs geladen`);
    } catch (err: any) {
      showError(err.message || "OSM-POIs konnten nicht geladen werden");
      setOsmError(true);
      console.error("[OpenMap OSM]", err);
    } finally {
      setLoadingOsm(false);
    }
  };

  useEffect(() => {
    if (showOsm) loadOsmPois();
  }, [showOsm, activeCategories]);

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

  // Dark mode observer
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

  // Theme handler
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        resetView();
      }, 150);
    }
  }, [isDarkMode, initialCompanies]);

  const handleImportPoi = (poi: any) => {
    importMutation.mutate(poi);
  };

  // Geocoding function
  const handleGeocode = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
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

  const toggleCategory = (key: PoiCategoryKey) => {
    setActiveCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Legend items
  const legendItems = Object.entries(statusLabels).map(([key, label]) => ({
    key,
    label,
    color: statusColors[key] || "#6b7280",
  }));

  function MapController({ companies }: { companies: CompanyForOpenMap[] }) {
    const map = useMap();

    useEffect(() => {
      if (companies.length === 0) return;

      const validCoords = companies
        .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
        .map((c) => [c.lat!, c.lon!] as [number, number]);

      if (validCoords.length === 0) return;

      const bounds = (window as any).L.latLngBounds(validCoords);
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

  return (
    <div className="relative h-full w-full">
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-8 right-4 z-[1001] flex flex-wrap gap-3 items-start">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGeocode()}
              placeholder="Adresse suchen (z.B. Hamburg Hafen)"
              className="bg-background/95 backdrop-blur-sm border shadow-md text-foreground"
            />
            <Button
              onClick={handleGeocode}
              disabled={isSearching}
              size="icon"
              className={`bg-card border shadow-md ${isDarkMode ? 'text-white' : 'text-black'} hover:bg-card`}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* POI Category Filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(poiCategories).map(([key, category]) => (
            <Button
              key={key}
              variant={activeCategories.includes(key as PoiCategoryKey) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleCategory(key as PoiCategoryKey)}
              className={`bg-background/95 backdrop-blur-sm border shadow-md whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'} hover:bg-card`}
            >
              {category.icon} {category.name}
            </Button>
          ))}
        </div>
      </div>

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
          {initialCompanies
            .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
            .map((company) => (
              <Marker key={company.id} position={[company.lat!, company.lon!]} icon={getStatusIcon(company.status)}>
                <Popup>
                  <div className="min-w-[320px] space-y-4 text-sm">
                    <h3 className="font-semibold text-lg">{company.firmenname}</h3>

                    <div className="flex flex-wrap gap-2">
                      {company.kundentyp && (
                        <span className="px-2 py-0.5 bg-muted rounded-full text-xs capitalize">
                          {company.kundentyp}
                        </span>
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
                    <button
                      onClick={() => handleImportPoi(poi)}
                      className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md w-full"
                    >
                      <Plus className="h-3 w-3 mr-1 inline" />
                      Zu CRM hinzufügen
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MarkerClusterGroup>
      </MapContainer>

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

        {osmError && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOsmPois()}
            className="bg-card border shadow-md hover:bg-card text-foreground"
          >
            Erneut versuchen
          </Button>
        )}

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
          <Card className="max-w-md">
            <CardContent className="text-center">
              <CardTitle className="mb-2">Keine Firmen mit Geodaten gefunden</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Firmen mit Breiten- und Längengrad werden hier angezeigt.
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
