// src/components/layout/AppLayout.tsx
// This component is used in the app directory to wrap all pages with a common 
// layout.

"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

import ErrorBoundary from "@/components/ErrorBoundary";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [_isMobile, setIsMobile] = useState(false);

  // Do not show sidebar + header on login and unauthorized pages
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
      <div className="flex h-screen">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
        <div
          className="flex-1 flex flex-col"
          style={{ marginLeft: isCollapsed ? "4rem" : "10rem" }}
        >
          <Header />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
