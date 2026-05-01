// src/components/layout/AppLayout.tsx
// This component is used in the app directory to wrap all pages with a common 
// layout.

"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ChangelogSpotlight } from "@/components/features/changelog/ChangelogSpotlight";
import type { AuthUser } from "@/lib/auth/types";
import packageJson from "../../../package.json";
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

  if (isAuthPage) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen">{children}</div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ChangelogSpotlight appVersion={packageJson.version} />
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