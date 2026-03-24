"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";

import Link from "next/link";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, MapPin, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors, statusLabels } from "@/lib/constants/status-colors";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";

type PoiCategoryKey = keyof typeof poiCategories;

export default function OpenMapClientInnerComponent({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<L.Map>(null);
  const hasFitted = useRef(false);

  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategories, setActiveCategories] = useState<PoiCategoryKey[]>(
    Object.keys(poiCategories) as PoiCategoryKey[],
  );
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(6);
  const [showOsm, setShowOsm] = useState(false);

  const queryClient = useQueryClient();

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
    onSuccess: (newCompany) => {
      toast.success(`"${newCompany.firmenname}" erfolgreich importiert`);
      queryClient.invalidateQueries({ queryKey: ["companiesForMap"] });
    },
    onError: (err: any) => toast.error("Import fehlgeschlagen", { description: err.message }),
  });

  const loadOsmPois = async (force = false) => {
    if (!mapRef.current) return;

    const zoom = mapRef.current.getZoom();
    setCurrentZoom(zoom);
    if (zoom < 12 && !force) return;

    if (activeCategories.length === 0) return;

    setLoadingOsm(true);

    try {
      const bounds = mapRef.current.getBounds();
      const result = await fetchOsmPois(bounds, activeCategories);
      setOsmPois(result.pois || []);
      toast.success(`${result.totalFound || 0} OSM-POIs im Ausschnitt`);
    } catch (err: any) {
      toast.error(err.message || "POIs konnten nicht geladen werden");
    } finally {
      setLoadingOsm(false);
    }
  };

  // Dynamic POI loading when map is moved or zoomed (only when showOsm is true)
  useEffect(() => {
    if (!showOsm || !mapRef.current) return;

    const handleMapChange = () => {
      const now = Date.now();
      if (now - lastLoadTime < 1500) return;   // increased debounce
      setLastLoadTime(now);
      loadOsmPois();
    };

    mapRef.current.on("moveend", handleMapChange);
    mapRef.current.on("zoomend", handleMapChange);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("moveend", handleMapChange);
        mapRef.current.off("zoomend", handleMapChange);
      }
    };
  }, [showOsm, lastLoadTime, activeCategories]);

  const toggleCategory = (key: PoiCategoryKey) => {
    setActiveCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const newPoiCount = useMemo(() => {
    return osmPois.filter((poi) => !initialCompanies.some((c) => c.osm === `${poi.type}/${poi.id}`)).length;
  }, [osmPois, initialCompanies]);

  const resetView = () => {
    if (mapRef.current && initialCompanies.length > 0) {
      const validCoords = initialCompanies
        .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
        .map((c) => [c.lat!, c.lon!] as [number, number]);
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        mapRef.current.fitBounds(bounds, { padding: [80, 80] });
      }
    }
  };

  const validCompanies = useMemo(() => {
    return initialCompanies.filter((c) => typeof c.lat === "number" && typeof c.lon === "number");
  }, [initialCompanies]);

  // Dark mode
  useEffect(() => {
    const updateDarkMode = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    updateDarkMode();
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const attribution = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`;

  const handleImportPoi = (poi: any) => importMutation.mutate(poi);

  const handleGeocode = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
      );
      const data = await res.json();
      if (data?.length > 0) {
        const { lat, lon, display_name } = data[0];
        mapRef.current.flyTo([parseFloat(lat), parseFloat(lon)], 15, { duration: 1.5 });
        toast.success(`Gefunden: ${display_name}`);
      } else {
        toast.error("Keine Ergebnisse gefunden");
      }
    } catch {
      toast.error("Geocoding fehlgeschlagen");
    } finally {
      setIsSearching(false);
    }
  };

  function MapController({ companies }: { companies: CompanyForOpenMap[] }) {
    const map = useMap();

    useEffect(() => {
      if (hasFitted.current || companies.length === 0) return;
      const validCoords = companies
        .filter((c) => typeof c.lat === "number" && typeof c.lon === "number")
        .map((c) => [c.lat!, c.lon!] as [number, number]);
      if (validCoords.length === 0) return;
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
      hasFitted.current = true;
    }, [companies, map]);

    return null;
  }

  const legendItems = Object.entries(statusLabels).map(([key, label]) => ({
    key,
    label,
    color: statusColors[key] || "#6b7280",
  }));

  return (
    <div className="relative h-full w-full">
      {/* Top Controls */}
      <div className="absolute top-4 left-12 right-20 z-[1001] flex items-start gap-6">
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
              className="bg-card border shadow-md text-foreground hover:bg-card"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 ml-auto">
          {Object.entries(poiCategories).map(([key, category]) => (
            <Button
              key={key}
              variant={activeCategories.includes(key as PoiCategoryKey) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleCategory(key as PoiCategoryKey)}
              className="text-xs bg-background/95 backdrop-blur-sm border shadow-md text-foreground hover:bg-card whitespace-nowrap"
            >
              {category.icon} {category.name}
            </Button>
          ))}
        </div>
      </div>

      <MapContainer
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

          {osmPois.map((poi: any) => (
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
            <p className="text-sm text-center">POIs werden geladen...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute top-28 right-6 z-[1100] bg-background/95 backdrop-blur-sm border rounded-2xl p-5 shadow-2xl min-w-[240px]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Status Legende
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLegend(false)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              ✕
            </Button>
          </div>
          <div className="space-y-2.5 text-sm">
            {legendItems.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 border-white flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Info Panel */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="bg-background/95 backdrop-blur-sm border shadow-md p-3 text-sm">
          <div className="flex items-center gap-2">
            {loadingOsm ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            <span>
              {loadingOsm
                ? "POIs werden geladen..."
                : currentZoom < 12
                  ? "Zoom näher heran für POIs"
                  : `${osmPois.length} POIs geladen (${newPoiCount} neue)`}
            </span>
          </div>
        </Card>
      </div>

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
          onClick={() => {
            if (showOsm) {
              console.log("[OpenMap] Toggle OFF");
              setShowOsm(false);
              setOsmPois([]);
            } else {
              if (mapRef.current) {
                const zoom = mapRef.current.getZoom();
                if (zoom < 12) {
                  toast("Zoom näher heran für POIs");
                  return;
                }
              }
              console.log("[OpenMap] Toggle ON");
              setShowOsm(true);
              setTimeout(() => loadOsmPois(true), 500); // small delay
            }
          }}
          disabled={loadingOsm}
          className="bg-card border shadow-md hover:bg-card text-foreground"
        >
          {loadingOsm ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>

        <Button
          variant={showLegend ? "default" : "secondary"}
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setShowLegend(!showLegend);
          }}
          className="bg-card border shadow-md hover:bg-card text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
