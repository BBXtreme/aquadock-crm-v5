// src/components/features/map/OpenMapClient.tsx
// This component is the client-side entry point for the OpenMap feature. It dynamically imports the main OpenMapView component and wraps it in an error boundary.

"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OpenMapViewSkeleton } from "@/components/ui/page-list-skeleton";
import type { CompanyForOpenMap } from "@/lib/actions/companies";
import { useT } from "@/lib/i18n/use-translations";

const OpenMapView = dynamic(() => import("./OpenMapView"), { ssr: false });

type OpenMapProps = {
  initialCompanies: CompanyForOpenMap[];
  mapLoadFailed?: boolean;
};

export function OpenMapClient({ initialCompanies, mapLoadFailed }: OpenMapProps) {
  const t = useT("openmap");

  if (mapLoadFailed) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/40">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">{t("loadErrorTitle")}</p>
          <p className="text-sm text-muted-foreground mt-2">{t("loadErrorDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<OpenMapViewSkeleton />}>
        <OpenMapView initialCompanies={initialCompanies} />
      </Suspense>
    </ErrorBoundary>
  );
}
