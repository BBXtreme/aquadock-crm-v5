// src/components/layout/AppLayout.tsx
// This component is used in the app directory to wrap all pages with a common 
// layout.

"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useState } from "react";

import ErrorBoundary from "@/components/ErrorBoundary";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  user: { role: string; display_name?: string | null };
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [_isMobile, setIsMobile] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/unauthorized";

  useEffect(() => {
    if (isAuthPage) return;

    const check = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsCollapsed(width < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [isAuthPage]);

  if (isAuthPage) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen">{children}</div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background"> {/* ← added bg-background for safety */}
        <Suspense fallback={<div className="w-16 bg-background border-r" />}>
          <Sidebar
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed(!isCollapsed)}
            user={user}
          />
        </Suspense>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          {/* Improved main: better overflow handling + padding control */}
          <main className="flex-1 overflow-auto p-0 relative">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}