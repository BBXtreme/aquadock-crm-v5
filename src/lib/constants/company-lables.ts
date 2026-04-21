// src/lib/constants/label-maps.ts
// Centralized label and emoji mappings for consistent display across the app.
// These records map internal values to user-friendly labels with emojis for better UX.
// Used in utility functions for rendering status, types, and other categorical data.

export const kundentypLabels: Record<string, string> = {
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

export const statusLabels: Record<string, string> = {
  gewonnen: "✅ Gewonnen",
  verloren: "❌ Verloren",
  lead: "🔍 Neu",
  interessant: "👀 Interessant",
  qualifiziert: "⭐ Qualifiziert",
  akquise: "🎯 Akquise",
  angebot: "📄 Angebot",
  kunde: "👤 Kunde",
  partner: "🤝 Partner",
  inaktiv: "⏸ Inaktiv",
};

export const firmentypLabels: Record<string, string> = {
  kette: "🏢 Kette",
  einzeln: "Einzelbetrieb",
};

export const countryFlags: Record<string, string | null> = {
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

export const priorityLabels: Record<string, string> = {
  hoch: "Hoch",
  normal: "Normal",
  niedrig: "Niedrig",
};

export const reminderStatusLabels: Record<string, string> = {
  open: "Offen",
  closed: "Erledigt",
};
