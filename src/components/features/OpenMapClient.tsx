"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
// import "react-leaflet-markercluster/dist/styles.min.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, Loader2 } from "lucide-react";
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

  return null;
}

export function OpenMapClient({ initialCompanies }: OpenMapProps) {
  const mapRef = useRef<L.Map>(null);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);

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

  const validCompanies = initialCompanies.filter(
    c => typeof c.lat === "number" && typeof c.lon === "number"
  );

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                <div className="min-w-[300px] space-y-4 text-sm">
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
                <div className="min-w-[220px]">
                  <h4 className="font-medium">{poi.tags?.name || "Unbenannter POI"}</h4>
                  <p className="text-xs text-muted-foreground">{poi.tags?.amenity || poi.tags?.tourism || "–"}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

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
