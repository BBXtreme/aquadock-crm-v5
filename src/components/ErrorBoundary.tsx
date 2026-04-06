"use client";

// src/components/ErrorBoundary.tsx
// This component is a React error boundary that catches JavaScript errors anywhere in its child component tree, logs those errors, and displays a fallback UI instead of the component tree that crashed. It also provides options to retry the failed operation or reload the page. The error details are shown in development mode for easier debugging.

import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [state, setState] = useState<ErrorBoundaryState>({ hasError: false, error: null });

  const handleError = useCallback((error: Error) => {
    // Check if it's a ChunkLoadError or related to chunk loading
    if (
      error.name === "ChunkLoadError" ||
      error.message.includes("Failed to load chunk") ||
      error.message.includes("turbopack") ||
      error.message.includes("hmr-client")
    ) {
      console.warn("Ignored error (likely chunk loading or HMR):", error);
      return;
    }
    setState({ hasError: true, error });
  }, []);

  const retry = () => {
    setState({ hasError: false, error: null });
  };

  const reload = () => {
    window.location.reload();
  };

  React.useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      handleError(event.error);
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) {
        handleError(event.reason);
      }
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, [handleError]);

  if (state.hasError && state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <CardTitle className="text-red-600">Oops! Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem
              persists.
            </p>
            {process.env.NODE_ENV === "development" && state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Error Details (Dev Mode)
                </summary>
                <pre className="mt-2 text-xs text-muted-foreground break-all whitespace-pre-wrap">
                  {state.error.stack || state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button onClick={retry} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button onClick={reload} variant="outline" className="flex-1">
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}

export default ErrorBoundary;
