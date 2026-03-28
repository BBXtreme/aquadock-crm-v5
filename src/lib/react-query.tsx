// src/lib/react-query.tsx
"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
            structuralSharing: true,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            toast.error("Query failed", {
              description: error instanceof Error ? `${error.name}: ${error.message}` : "An unexpected error occurred",
            });
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
