// src/lib/react-query.tsx
"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

/**
 * React Query Provider
 *
 * Devtools Control:
 * - Change SHOW_DEVTOOLS to true  → Devtools visible (good for development)
 * - Change SHOW_DEVTOOLS to false → Devtools hidden (recommended for production)
 */

const SHOW_DEVTOOLS = false; // ← Change to false before deploying to Vercel

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds - good balance
            gcTime: 10 * 60 * 1000, // 10 minutes cache
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

      {/* TanStack React Query Devtools - only shown when SHOW_DEVTOOLS is true */}
      {SHOW_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
