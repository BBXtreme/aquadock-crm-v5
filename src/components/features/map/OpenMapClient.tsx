// src/components/features/map/OpenMapClient.tsx
// This component is the client-side entry point for the OpenMap feature. It dynamically imports the main OpenMapView component and wraps it in an error boundary.

"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { OpenMapViewSkeleton } from "@/components/ui/page-list-skeleton";
import type { CompanyForOpenMap } from "@/lib/actions/companies";
import { useT } from "@/lib/i18n/use-translations";

const OpenMapView = dynamic(() => import("./OpenMapView"), { ssr: false });

type OpenMapProps = {
  initialCompanies: CompanyForOpenMap[];
  mapLoadFailed?: boolean;
};

function OpenMapErrorFallback() {
  const t = useT("openmap");
  return (
    <div className="h-full flex items-center justify-center bg-muted/40 p-8">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">{t("loadErrorTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-6">{t("loadErrorDescription")}</p>
        <Button type="button" onClick={() => window.location.reload()} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("mapBoundaryReload")}
        </Button>
      </div>
    </div>
  );
}

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
    <ErrorBoundary fallback={<OpenMapErrorFallback />}>
      <Suspense fallback={<OpenMapViewSkeleton />}>
        <OpenMapView initialCompanies={initialCompanies} />
      </Suspense>
    </ErrorBoundary>
  );
}
