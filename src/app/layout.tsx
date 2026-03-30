// src/app/layout.tsx
// This is the root layout for the entire application. It wraps all pages and components, providing a consistent structure and styling across the app.

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import type React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import ClientLayout from "@/components/layout/ClientLayout";
import { getCurrentUser } from "@/lib/supabase/auth/get-current-user";

export const metadata: Metadata = {
  title: "AquaDock CRM",
  description: "Marine CRM for managing companies and contacts",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pre-fetch current user on server for better hydration (optional but recommended)
  const _user = await getCurrentUser();

  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased min-h-screen bg-background`}>
        <ErrorBoundary>
          <ClientLayout>
            <AppLayout>{children}</AppLayout>
          </ClientLayout>
        </ErrorBoundary>
      </body>
    </html>
  );
}