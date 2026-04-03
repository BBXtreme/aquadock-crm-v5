// src/lib/query/provider.tsx
/* React Query Provider component with optional Devtools for development
Provides a request-scoped QueryClient for proper SSR + hydration
Usage:
- Wrap your app with <ReactQueryProvider> in the root layout
- Set SHOW_DEVTOOLS to true to enable Devtools (good for development)
- Set SHOW_DEVTOOLS to false to disable Devtools (recommended for production)
Security: Using a request-scoped QueryClient ensures that data is not shared 
between users in SSR environments, preventing potential data leaks.
Note: The QueryClient is created using React.cache to ensure it is scoped 
to the request and properly hydrated on the client side.
This file is intentionally simple and focused on providing the React Query 
context to the app. All query logic should be implemented in separate hooks 
(e.g., useCompanies, useContacts) that utilize the QueryClient provided here.
*/

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { getQueryClient } from "./client";

/**
 * React Query Provider
 *
 * Devtools Control:
 * - Change SHOW_DEVTOOLS to true  → Devtools visible (good for development)
 * - Change SHOW_DEVTOOLS to false → Devtools hidden (recommended for production)
 */

const SHOW_DEVTOOLS = false; // ← Change to true/false before deploying to Vercel

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Use request-scoped QueryClient (via React.cache) for proper SSR + hydration
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* TanStack React Query Devtools - only shown when SHOW_DEVTOOLS is true */}
      {SHOW_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
