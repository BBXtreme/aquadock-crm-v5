"use client";

import { Marker, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";

import Link from "next/link";

import { Info, Loader2, MapPin, Plus, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors, statusLabels } from "@/lib/constants/status-colors";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";
import { useOpenMap } from "@/hooks/useOpenMap";

type PoiCategoryKey = keyof typeof poiCategories;

export default function OpenMapView({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const {
    loadingOsm,
    osmPois,
    showLegend,
    setShowLegend,
    isDarkMode,
    searchQuery,
    setSearchQuery,
    isSearching,
    activeCategories,
    loadOsmPois,
    toggleCategory,
    resetView,
    handleGeocode,
    handleImportPoi,
    newPoiCount,
    validCompanies,
    tileUrl,
    attribution,
    legendItems,
    mapRef,
    mapReady,
    setMapReady,
    MapController,
  } = useOpenMap(initialCompanies);

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
        ref={(ref) => {
          mapRef.current = ref;
          if (ref) setMapReady(true);
        }}
        center={[51.1657, 10.4515]}
        zoom={6}
        style={{ height: "100%", width: "100%", backgroundColor: isDarkMode ? "black" : "white" }}
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
              icon={getOsmPoiIcon(isDarkMode)}
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
          variant="secondary"
          size="icon"
          className="bg-card border shadow-md text-foreground cursor-default pointer-events-none"
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
