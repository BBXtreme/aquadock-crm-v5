"use client";

import React, { useState } from "react";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const [key, setKey] = useState(0);

  const reset = () => {
    setError(null);
    setKey((prev) => prev + 1);
  };

  if (error) {
    return (
      fallback || (
        <div className="h-full flex items-center justify-center bg-muted/40 p-8">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Kartenfehler</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Die Karte konnte nicht geladen werden. Bitte versuchen Sie es erneut.
            </p>
            <Button onClick={reset} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Karte neu laden
            </Button>
          </div>
        </div>
      )
    );
  }

  return <React.Fragment key={key}>{children}</React.Fragment>;
}
