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
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
