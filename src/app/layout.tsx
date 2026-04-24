// src/app/layout.tsx
// This is the root layout for the entire application. It wraps all pages and components, providing a consistent structure and styling across the application.

import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import type React from "react";

import ErrorBoundary from "@/components/ErrorBoundary";
import ClientLayout from "@/components/layout/ClientLayout";
import { RootDocumentLang } from "@/components/layout/RootDocumentLang";
import { PW_RECOVERY_SESSION_STORAGE_KEY } from "@/lib/constants/auth-recovery";
import { LS_APPEARANCE_LOCALE } from "@/lib/constants/theme";

export const metadata: Metadata = {
  title: "AquaDock CRM",
  description: "Marine CRM for managing companies and contacts",
};

/**
 * Runs before first paint (blocking). Mirrors `parseAppearanceLocale` + `resolveAppLocale` for en/de/hr (fr → de).
 * SSR keeps `lang="de"`; this aligns the live document with the appearance locale mirror when localStorage is available.
 */
const rootLangBootstrapScript = `(function(){try{var k=${JSON.stringify(LS_APPEARANCE_LOCALE)};var raw=localStorage.getItem(k);if(raw==null||raw==="")return;var t=String(raw).trim();if(t==="fr")t="de";if(t==="en"||t==="hr"||t==="de")document.documentElement.lang=t;}catch(_){}})();`;

/**
 * Runs before React / Supabase; flags recovery hash or PKCE `code` on `/login` before the client consumes the URL.
 * Use `URLSearchParams.has("code")` — substring `code=` matches `error_code=` and latched the page into recovery UI.
 */
const pwRecoveryBootstrapScript = `(function(){try{var path=location.pathname||"";if(!/\\/login\\/?$/.test(path))return;var key=${JSON.stringify(PW_RECOVERY_SESSION_STORAGE_KEY)};var frag=(location.hash||"").replace(/^#/,"");if(frag.indexOf("type=recovery")>=0||frag.indexOf("type%3Drecovery")>=0){sessionStorage.setItem(key,"1");return;}var q=location.search||"";if(q.length>1){var sp=new URLSearchParams(q.slice(1));if(sp.has("code"))sessionStorage.setItem(key,"1");}}catch(_){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background">
        <Script
          id="aquadock-root-lang-bootstrap"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Build-time-only script; sets html lang from LS_APPEARANCE_LOCALE mirror (en/de/hr); no user input.
          dangerouslySetInnerHTML={{ __html: rootLangBootstrapScript }}
        />
        <Script
          id="aquadock-pw-recovery-bootstrap"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Flags password-recovery hash before Supabase client strips it; key is app-owned; no user input.
          dangerouslySetInnerHTML={{ __html: pwRecoveryBootstrapScript }}
        />
        <RootDocumentLang />
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
        <Analytics />
      </body>
    </html>
  );
}
