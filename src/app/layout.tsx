// src/app/layout.tsx
// This file defines the root layout for the application, which wraps all pages and components.
// It sets up the HTML structure, including the <html> and <body> tags, and applies global styles and fonts.
// The layout includes a ClientLayout component that provides context for client-side features
// (like Supabase) and an AppLayout component that defines the main structure of the app (header, sidebar, etc.).
// By using this root layout, we ensure that all pages have a consistent structure and access
// to necessary contexts and styles without needing to repeat this setup in each page component.

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import type React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import ClientLayout from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "AquaDock CRM",
  description: "Marine CRM for managing companies and contacts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
