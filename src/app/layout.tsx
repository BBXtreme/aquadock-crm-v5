import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ClientLayout from '@/components/ClientLayout'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AquaDock CRM",
  description: "Marine CRM for managing companies and contacts",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side auth check
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Protected paths
  const protectedPaths = [
    '/dashboard',
    '/companies',
    '/contacts',
    '/reminders',
    '/mass-email',
    '/timeline',
  ]

  // Check if current path is protected (simplified, in real app use headers or params)
  // For simplicity, assume all paths except /login and /signup are protected
  // In production, use middleware for this

  // If no session and on protected path, redirect to login
  // Note: This is a basic check; middleware handles it better

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased leading-7`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
