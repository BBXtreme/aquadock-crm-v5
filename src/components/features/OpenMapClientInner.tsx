"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
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

  // ... (rest will be added in next steps)

  return <div>Inner component placeholder</div>;
}
