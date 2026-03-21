"use client";

import React from "react";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    toast.error("An unexpected error occurred. Please try refreshing the page.");
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{
  error?: Error;
  resetError: () => void;
}> = ({ error, resetError }) => (
  <div className="flex min-h-screen items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md rounded-xl border border-red-500 bg-card text-card-foreground shadow-sm">
      <CardHeader className="text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <CardTitle className="font-semibold text-red-600 text-xl">Something went wrong</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-muted-foreground">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error && (
          <details className="text-muted-foreground text-sm">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{error.message}</pre>
          </details>
        )}
        <div className="flex space-x-2">
          <Button onClick={resetError} className="flex-1 bg-[#24BACC] text-white hover:bg-[#1da0a8]">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default ErrorBoundary;
