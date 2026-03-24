"use client";

import { useQuery } from "@tanstack/react-query";

import { OpenMapClient } from "@/components/features/OpenMapClient";
import { getCompaniesForOpenMap } from "@/lib/supabase/services/companies";

export default function OpenMapPage() {
  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ["companiesForMap"],
    queryFn: () => getCompaniesForOpenMap(""), // temporary empty until auth is ready
  });

  if (isLoading) {
    return <div className="h-[calc(100vh-4rem)] flex items-center justify-center">Loading map...</div>;
  }

  if (error) {
    return <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-red-600">Error loading companies</div>;
  }

  return <OpenMapClient initialCompanies={companies} />;
}
