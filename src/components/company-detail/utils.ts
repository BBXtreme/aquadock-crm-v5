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
