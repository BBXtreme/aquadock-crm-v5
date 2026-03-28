"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
            <CardTitle className="text-red-600">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">An unexpected error occurred. Please try again.</p>
            {error && <p className="text-xs text-muted-foreground break-all">{error.message}</p>}
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
