"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
// import "react-leaflet-markercluster/dist/styles.min.css";
import L from "leaflet";
import { useEffect, useRef, useState, useMemo } from "react";
import { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, Loader2, Plus, Info } from "lucide-react";
import { getStatusIcon, fetchOsmPois } from "@/lib/utils/map";

// Fix default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

type OpenMapProps = {
  initialCompanies: CompanyForOpenMap[];
};

function MapController({ companies }: { companies: CompanyForOpenMap[] }) {
  const map = useMap();

  useEffect(() => {
    if (companies.length === 0) return;

    const validCoords = companies
      .filter(c => typeof c.lat === "number" && typeof c.lon === "number")
      .map(c => [c.lat!, c.lon!] as [number, number]);

    if (validCoords.length === 0) return;

    const bounds = L.latLngBounds(validCoords);
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    console.log(`[OpenMap] Auto-fitted to ${validCoords.length} locations`);
  }, [companies, map]);

  // Handle resize when sidebar collapses
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => map.invalidateSize(), 300);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  return null;
}

export function OpenMapClient({ initialCompanies }: OpenMapProps) {
  const mapRef = useRef<L.Map>(null);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [showLegend, setShowLegend] = useState(false);

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
          .filter(c => typeof c.lat === "number" && typeof c.lon === "number")
          .map(c => [c.lat!, c.lon!])
      );
      mapRef.current.fitBounds(bounds, { padding: [80, 80] });
    }
  };

  const validCompanies = useMemo(() => {
    return initialCompanies.filter(
      c => typeof c.lat === "number" && typeof c.lon === "number"
    );
  }, [initialCompanies]);

  const isDarkMode = useMemo(() => {
    return document.documentElement.classList.contains("dark");
  }, []);

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution = isDarkMode
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const handleImportPoi = (poi: any) => {
    // Placeholder for future mutation
    toast.info(`Import von ${poi.tags?.name || "POI"} geplant`);
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={mapRef}
        center={[51.1657, 10.4515]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
        />

        <MapController companies={initialCompanies} />

        <MarkerClusterGroup chunkedLoading maxClusterRadius={100}>
          {validCompanies.map((company) => (
            <Marker
              key={company.id}
              position={[company.lat!, company.lon!]}
              icon={getStatusIcon(company.status)}
            >
              <Popup>
                <div className="min-w-[320px] space-y-4 text-sm">
                  <h3 className="font-semibold text-lg">{company.firmenname}</h3>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs capitalize">
                      {company.kundentyp || "–"}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs capitalize">
                      {company.status || "–"}
                    </span>
                  </div>

                  <div className="text-muted-foreground">
                    {company.stadt && <>{company.stadt}, </>}{company.land || "–"}
                  </div>

                  {company.value && (
                    <div className="font-medium">
                      Potenzial: €{company.value.toLocaleString("de-DE")}
                    </div>
                  )}

                  <div className="pt-3 flex flex-wrap gap-2">
                    {company.telefon && (
                      <a href={`tel:${company.telefon}`} className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md">
                        Anrufen
                      </a>
                    )}
                    {company.website && (
                      <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md">
                        Website
                      </a>
                    )}
                    <Link href={`/companies/${company.id}`} className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 text-accent-foreground rounded-md">
                      Details öffnen
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {showOsm && osmPois.map((poi: any) => (
            <Marker
              key={poi.id}
              position={[poi.lat || poi.center?.lat, poi.lon || poi.center?.lon]}
              icon={L.divIcon({
                className: "osm-poi",
                html: '<div style="background:#22c55e;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">P</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              <Popup>
                <div className="min-w-[220px] space-y-2">
                  <h4 className="font-medium">{poi.tags?.name || "Unbenannter POI"}</h4>
                  <p className="text-xs text-muted-foreground">{poi.tags?.amenity || poi.tags?.tourism || "–"}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleImportPoi(poi)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Zu CRM hinzufügen
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Legend */}
      {showLegend && (
        <div className="absolute top-20 right-4 z-[1000] bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-md">
          <h4 className="font-medium text-sm mb-2">Status Legende</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              Lead
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              Qualifiziert
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              Akquise
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-pink-500"></div>
              Angebot
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              Gewonnen
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              Verloren
            </div>
          </div>
        </div>
      )}

      {/* Floating Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button variant="secondary" size="icon" onClick={resetView} className="bg-background/90 backdrop-blur-sm shadow-md">
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button
          variant={showOsm ? "default" : "secondary"}
          size="icon"
          onClick={() => setShowOsm(!showOsm)}
          disabled={loadingOsm}
          className="bg-background/90 backdrop-blur-sm shadow-md"
        >
          {loadingOsm ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>

        <Button
          variant={showLegend ? "default" : "secondary"}
          size="icon"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-background/90 backdrop-blur-sm shadow-md"
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
