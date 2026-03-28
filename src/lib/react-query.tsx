// src/lib/react-query.tsx
"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

/**
 * React Query Provider for the entire app.
 *
 * How to control Devtools:
 * 1. Normal development: Devtools are automatically shown.
 * 2. Disable completely: Change `SHOW_DEVTOOLS` to false below.
 * 3. Force show in production (for debugging on Vercel): Set env variable NEXT_PUBLIC_SHOW_QUERY_DEVTOOLS=true
 *
 * Recommended: Keep SHOW_DEVTOOLS = true during active development.
 * Set to false before final production deployment.
 */
const SHOW_DEVTOOLS = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SHOW_QUERY_DEVTOOLS === "true";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds - good balance for lists and detail pages
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 2,
            refetchOnWindowFocus: false,
            structuralSharing: true,
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            const queryKey = query?.meta?.queryKey || query?.queryKey;
            const context = queryKey ? ` (Query: ${Array.isArray(queryKey) ? queryKey.join(" > ") : queryKey})` : "";
            toast.error("An error occurred", {
              description: `${error instanceof Error ? error.message : "An unexpected error occurred"}${context}`,
              id: "query-error",
            });
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* TanStack React Query Devtools */}
      {SHOW_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />}
    </QueryClientProvider>
  );
}
