// Utility functions for general use across the app - src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getKundentypLabel(t: string): string {
  const map: Record<string, string> = {
    restaurant: "🍽 Restaurant",
    hotel: "🏨 Hotel",
    resort: "🌴 Resort",
    camping: "⛺ Camping",
    marina: "⚓ Marina",
    segelschule: "⛵ Segelschule",
    segelverein: "🏆 Segelverein",
    bootsverleih: "🚤 Bootsverleih",
    neukunde: "🆕 Neukunde",
    bestandskunde: "⭐ Bestandskunde",
    interessent: "👁 Interessent",
    partner: "🤝 Partner",
    sonstige: "Sonstige",
  };
  return map[t.toLowerCase()] || t;
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    gewonnen: "✅ Gewonnen",
    verloren: "❌ Verloren",
    lead: "🔍 Lead",
    interessant: "👀 Interessant",
    qualifiziert: "⭐ Qualifiziert",
    akquise: "🎯 Akquise",
    angebot: "📄 Angebot",
    kunde: "👤 Kunde",
    partner: "🤝 Partner",
    inaktiv: "⏸ Inaktiv",
  };
  return map[status.toLowerCase()] || status;
}

export function getFirmentypLabel(firmentyp: string): string {
  if (firmentyp.toLowerCase() === "kette") return "🏢 Kette";
  return "🏠 Einzelbetrieb";
}

export function getCountryFlag(country: string | null): string | null {
  const flagMap: Record<string, string> = {
    Deutschland: "🇩🇪",
    Österreich: "🇦🇹",
    Schweiz: "🇨🇭",
    Frankreich: "🇫🇷",
    Italien: "🇮🇹",
    Spanien: "🇪🇸",
    Niederlande: "🇳🇱",
    Belgien: "🇧🇪",
    Dänemark: "🇩🇰",
    Schweden: "🇸🇪",
    Norwegen: "🇳🇴",
    Polen: "🇵🇱",
    Ungarn: "🇭🇺",
    Griechenland: "🇬🇷",
    Portugal: "🇵🇹",
    Großbritannien: "🇬🇧",
  };
  return country ? flagMap[country] || "🏳️" : null;
}

export function getPriorityLabel(p: string | null | undefined): string {
  const map: Record<string, string> = {
    hoch: "🔴 Hoch",
    normal: "🟡 Normal",
    niedrig: "⚪ Niedrig",
  };
  return map[p?.toLowerCase() || ""] || p || "—";
}

export function getReminderStatusLabel(s: string | null | undefined): string {
  const map: Record<string, string> = {
    open: "🔵 Offen",
    closed: "✅ Erledigt",
  };
  return map[s?.toLowerCase() || ""] || s || "—";
}

export function formatDateDE(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function safeDisplay(value: unknown): string {
  if (value == null) return "—";
  return String(value);
}
