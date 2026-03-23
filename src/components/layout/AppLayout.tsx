"use client";

import type React from "react";
import { useEffect, useState } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsCollapsed(width < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar isCollapsed={isCollapsed} isMobile={isMobile} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 flex flex-col" style={{ marginLeft: isCollapsed ? '4rem' : '10rem' }}>
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
