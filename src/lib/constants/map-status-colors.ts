// src/lib/constants/map-status-colors.ts
// This file defines color constants for different map marker statuses used in the application.
// The colors are defined in a record where the key is the status (in lowercase) and the value is the corresponding color code.
// These colors are used to visually differentiate between different statuses of companies or points of interest on the map.
// The file also includes label mappings for statuses and badge colors for various categories, ensuring a consistent visual language across the app.

export const statusColors: Record<string, string> = {
  lead: "#f59e0b", // amber
  qualifiziert: "#3b82f6", // blue
  akquise: "#8b5cf6", // violet
  angebot: "#22c55e", // emerald green (positive)
  gewonnen: "#10b981", // emerald
  verloren: "#ef4444", // red
  kunde: "#14b8a6", // teal
  partner: "#6366f1", // indigo
  inaktiv: "#6b7280", // gray
};

export const statusLabels: Record<string, string> = {
  lead: "Lead",
  qualifiziert: "Qualifiziert",
  akquise: "Akquise",
  angebot: "Angebot",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
  kunde: "Kunde",
  partner: "Partner",
  inaktiv: "Inaktiv",
};

export const badgeColors: Record<string, string> = {
  ...statusColors,
  restaurant: "#f59e0b",
  hotel: "#3b82f6",
  marina: "#8b5cf6",
  camping: "#22c55e",
  bootsverleih: "#10b981",
  segelschule: "#14b8a6",
  resort: "#6366f1",
  sonstige: "#6b7280",
};
