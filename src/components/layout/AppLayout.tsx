// src/components/layout/AppLayout.tsx
// This component is used in the app directory to wrap all pages with a common 
// layout.

"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

import ErrorBoundary from "@/components/ErrorBoundary";
import type { AuthUser } from "@/lib/auth/types";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  user: AuthUser;
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/unauthorized";

  useEffect(() => {
    if (isAuthPage) return;

    const check = () => {
      const width = window.innerWidth;
      setIsCollapsed(width < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [isAuthPage]);

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7811/ingest/4f661c1b-aa49-4778-8f27-b8a02ff82f19", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2fbdf8" },
      body: JSON.stringify({
        sessionId: "2fbdf8",
        location: "AppLayout.tsx:shell",
        message: "AppLayout shell path",
        data: { pathname, isAuthPage, willRenderSidebar: !isAuthPage },
        timestamp: Date.now(),
        hypothesisId: "H5",
      }),
    }).catch(() => {
      /* debug ingest optional */
    });
  }, [pathname, isAuthPage]);
  // #endregion

  if (isAuthPage) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen">{children}</div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          user={user}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={user} />

          <main className="relative flex-1 overflow-auto p-0">{children}</main>
        </div>
      </div>
    </ErrorBoundary>
  );
}