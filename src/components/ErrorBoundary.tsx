// src/components/ErrorBoundary.tsx
// This component is a React error boundary that catches JavaScript errors anywhere in its child component tree, logs those errors, and displays a fallback UI instead of the component tree that crashed. It also provides options to retry the failed operation or reload the page. The error details are shown in development mode for easier debugging.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  const retry = () => {
    setHasError(false);
    setError(null);
    queryClient.resetQueries();
  };

  const reload = () => {
    window.location.reload();
  };

  if (hasError) {
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
            {process.env.NODE_ENV === "development" && error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Error Details (Dev Mode)
                </summary>
                <pre className="mt-2 text-xs text-muted-foreground break-all whitespace-pre-wrap">
                  {error.stack || error.message}
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

  return <>{children}</>;
}
