"use client";

// Class-based error boundary: catches render errors in the tree (not event/async errors).

import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    if (
      error.name === "ChunkLoadError" ||
      error.message.includes("Failed to load chunk") ||
      error.message.includes("turbopack") ||
      error.message.includes("hmr-client")
    ) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (
      error.name === "ChunkLoadError" ||
      error.message.includes("Failed to load chunk") ||
      error.message.includes("turbopack") ||
      error.message.includes("hmr-client")
    ) {
      return;
    }
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary componentDidCatch:", error, errorInfo);
    }
  }

  private retry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private reload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    const { error, hasError } = this.state;
    if (hasError && error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
              <CardTitle className="text-destructive">Oops! Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem
                persists.
              </p>
              {process.env.NODE_ENV === "development" && (
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
                <Button type="button" onClick={this.retry} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button type="button" onClick={this.reload} variant="outline" className="flex-1">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}
