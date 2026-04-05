// src/app/layout.tsx
// This is the root layout for the entire application. It wraps all pages and components, providing a consistent structure and styling across the app.

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import type React from "react";

import ErrorBoundary from "@/components/ErrorBoundary";
import ClientLayout from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "AquaDock CRM",
  description: "Marine CRM for managing companies and contacts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased min-h-screen bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <ClientLayout>
              {children}
            </ClientLayout>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
