// src/components/features/auth/PartnerThemeProvider.tsx
//
// Scoped partner theme. We deliberately do NOT touch the CRM design tokens
// (`--primary`, `--ring`, …). Instead we expose a separate, partner-only set
// of CSS variables on a wrapper element so the partner surfaces feel
// distinctly different from the internal CRM shell:
//
//   --partner-canvas       — warm beige page background
//   --partner-canvas-mist  — secondary surface (cards over photography)
//   --partner-ink          — primary text
//   --partner-ink-soft     — secondary text
//   --partner-accent       — ocean teal accent (links, focus rings, CTA)
//   --partner-accent-strong — saturated CTA fill
//   --partner-accent-soft  — translucent accent for chips/badges
//   --partner-hairline     — subtle separators
//   --partner-scrim        — overlay on hero imagery
//
// Tokens map to Brand Guide v3.0 §7: canvas warm + ocean accents, with a
// premium outdoor feel.

"use client";

import type { ReactNode } from "react";

interface PartnerThemeProviderProps {
  children: ReactNode;
}

export function PartnerThemeProvider({ children }: PartnerThemeProviderProps) {
  return (
    <div
      data-partner-theme
      className="partner-theme-root min-h-screen"
      style={{
        // Core brand tokens (mirrors website tone)
        ["--partner-brand-water" as string]: "#00a0c4",
        ["--partner-brand-teal" as string]: "#26a69a",
        ["--partner-brand-cta" as string]: "#ff6f00",
        ["--partner-brand-ink" as string]: "#001f3f",
        ["--partner-brand-ink-muted" as string]: "#5c7a8a",
        ["--partner-brand-border" as string]: "#cfd8dc",
        // Editorial surface tokens from website style system
        ["--partner-canvas" as string]: "#f6f7f4",
        ["--partner-canvas-warm" as string]: "#f6f7f4",
        ["--partner-canvas-mist" as string]:
          "color-mix(in srgb, #e0f7fa 35%, #f6f7f4)",
        ["--partner-card" as string]: "#ffffff",
        ["--partner-hairline" as string]:
          "color-mix(in srgb, #cfd8dc 55%, transparent)",
        ["--partner-ink" as string]: "#001f3f",
        ["--partner-ink-soft" as string]:
          "color-mix(in srgb, #001f3f 88%, white 12%)",
        ["--partner-accent" as string]: "#00a0c4",
        ["--partner-accent-soft" as string]: "rgba(0, 160, 196, 0.12)",
        ["--partner-cta" as string]: "#ff6f00",
        ["--partner-scrim-deep" as string]: "rgba(10, 22, 40, 0.45)",
        ["--partner-scrim-mid" as string]: "rgba(10, 22, 40, 0.32)",
        backgroundColor: "var(--partner-canvas)",
        color: "var(--partner-ink)",
      }}
    >
      {children}
    </div>
  );
}
