// src/lib/constants/company-labels.ts
// Centralized label and emoji mappings for consistent display across the app.
// These records map internal values to user-friendly labels with emojis for better UX.
// Country display uses ISO `companies.land` via `@/lib/countries/iso-land`, not this file.

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

export const priorityLabels: Record<string, string> = {
  hoch: "Hoch",
  normal: "Normal",
  niedrig: "Niedrig",
};

export const reminderStatusLabels: Record<string, string> = {
  open: "Offen",
  closed: "Erledigt",
};
