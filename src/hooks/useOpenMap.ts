import { useEffect, useMemo, useRef, useState } from "react";

import L from "leaflet";
import { useMap } from "react-leaflet";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors, statusLabels } from "@/lib/constants/status-colors";
import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getOsmPoiIcon, getStatusIcon } from "@/lib/utils/map";

type PoiCategoryKey = keyof typeof poiCategories;

export function useOpenMap(initialCompanies: CompanyForOpenMap[]) {
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
  const [mapReady, setMapReady] = useState(false);

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
    console.log("[OpenMap] loadOsmPois called", { force, loadingOsm });
    if (!mapRef.current || loadingOsm) {
      console.log("[OpenMap] loadOsmPois early return", { mapRef: !!mapRef.current, loadingOsm });
      return;
    }

    const zoom = mapRef.current.getZoom();
    setCurrentZoom(zoom);
    console.log("[OpenMap] Current zoom:", zoom);
    if (zoom < 12 && !force) {
      console.log("[OpenMap] Zoom too low, not loading");
      return;
    }

    if (activeCategories.length === 0) {
      console.log("[OpenMap] No active categories");
      return;
    }

    setLoadingOsm(true);
    console.log("[OpenMap] Starting OSM POI load");

    try {
      const bounds = mapRef.current.getBounds();
      console.log("[OpenMap] Fetching bounds:", bounds.toBBoxString());
      const result = await fetchOsmPois(bounds, activeCategories);
      setOsmPois(result.pois || []);
      console.log("[OpenMap] Loaded POIs:", result.totalFound);
      toast.success(`${result.totalFound || 0} OSM-POIs im Ausschnitt`);
    } catch (err: any) {
      console.error("[OpenMap] Failed to load OSM POIs", err);
      if (err.message.includes("429")) {
        toast.error("API überlastet, bitte kurz warten");
      } else {
        toast.error(err.message || "POIs konnten nicht geladen werden");
      }
    } finally {
      setLoadingOsm(false);
      console.log("[OpenMap] Finished OSM POI load");
    }
  };

  // Dynamic POI loading when map is moved or zoomed
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapChange = () => {
      const now = Date.now();
      if (now - lastLoadTime < 2000) {
        console.log("[OpenMap] Debounced map change");
        return;
      }
      setLastLoadTime(now);

      const zoom = mapRef.current!.getZoom();
      setCurrentZoom(zoom);
      console.log("[OpenMap] Map changed, zoom:", zoom);
      if (zoom < 12) {
        console.log("[OpenMap] Clearing POIs due to low zoom");
        setOsmPois([]);
      } else {
        console.log("[OpenMap] Loading POIs due to map change");
        loadOsmPois();
      }
    };

    mapRef.current.on("moveend", handleMapChange);
    mapRef.current.on("zoomend", handleMapChange);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("moveend", handleMapChange);
        mapRef.current.off("zoomend", handleMapChange);
      }
    };
  }, [lastLoadTime, activeCategories]);

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

  // Automatic POI loading on mount
  useEffect(() => {
    if (!mapReady) return;
    const zoom = mapRef.current!.getZoom();
    if (zoom >= 12) {
      loadOsmPois(true);
    }
  }, [mapReady]);

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

  return {
    // states
    loadingOsm,
    osmPois,
    showLegend,
    setShowLegend,
    isDarkMode,
    searchQuery,
    setSearchQuery,
    isSearching,
    activeCategories,
    // functions
    loadOsmPois,
    toggleCategory,
    resetView,
    handleGeocode,
    handleImportPoi,
    // computed
    newPoiCount,
    validCompanies,
    tileUrl,
    attribution,
    legendItems,
    // refs
    mapRef,
    // mapReady
    mapReady,
    setMapReady,
    // component
    MapController,
  };
}
