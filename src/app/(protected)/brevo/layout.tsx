// src/app/(protected)/brevo/layout.tsx
import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Brevo Campaigns",
  description: "Newsletter- und E-Mail-Kampagnen über Brevo verwalten",
};

export default function BrevoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
