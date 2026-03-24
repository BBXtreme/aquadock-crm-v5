import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import type React from "react";

import ClientLayout from "@/components/layout/ClientLayout";
import AppLayout from "@/components/layout/AppLayout";

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
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased min-h-screen bg-background`}
      >
        <ClientLayout>
          <AppLayout>{children}</AppLayout>
        </ClientLayout>
      </body>
    </html>
  );
}
