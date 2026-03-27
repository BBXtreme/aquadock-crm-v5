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
    "Großbritannien": "🇬🇧",
  };
  return country ? flagMap[country] || "🏳️" : null;
}
