// src/lib/query/client.ts
// This file sets up a QueryClient for use with TanStack Query
// (React Query)

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { toast } from "sonner";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute – better for CRM data
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
        structuralSharing: true,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        const queryKey = query?.meta?.queryKey || query?.queryKey;
        const context = queryKey ? ` (Query: ${Array.isArray(queryKey) ? queryKey.join(" > ") : queryKey})` : "";

        // Defer toast until after the current commit so Sonner has mounted (Toaster is ordered before
        // {children} in ClientLayout; microtask avoids sync updates during React mount).
        queueMicrotask(() => {
          toast.error("An error occurred", {
            description: `${error instanceof Error ? error.message : "An unexpected error occurred"}${context}`,
            id: "query-error",
          });
        });
      },
    }),
  });
}

// Request-scoped QueryClient on server, singleton on client
export const getQueryClient = cache(makeQueryClient);

// Export the queryClient instance for use in class components or non-hook contexts
export const queryClient = getQueryClient();
