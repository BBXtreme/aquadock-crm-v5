"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CompanyForOpenMap } from "@/lib/supabase/services/companies";
import { importOsmPoi } from "@/lib/supabase/services/companies";
import { fetchOsmPois, getStatusIcon } from "@/lib/utils/map";
import { statusColors, statusLabels } from "@/lib/constants/status-colors";

export default function OpenMapClientInnerComponent({ initialCompanies }: { initialCompanies: CompanyForOpenMap[] }) {
  const mapRef = useRef<L.Map>(null);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmPois, setOsmPois] = useState<any[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  return <div>Inner component placeholder</div>;
}
