"use client";

import type React from "react";

import { AppearanceHydration } from "@/components/theme/tailwind/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactQueryProvider } from "@/lib/query/provider";

/** ThemeProvider lives in root `app/layout.tsx` only — avoid duplicate providers. */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ReactQueryProvider>
        <AppearanceHydration />
        <Toaster richColors position="top-right" />
        {children}
      </ReactQueryProvider>
    </TooltipProvider>
  );
}
