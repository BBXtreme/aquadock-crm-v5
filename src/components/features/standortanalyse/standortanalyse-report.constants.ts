export const CRITERIA_COLORS: Record<string, string> = {
  Gut: "var(--score-success)",
  Mittel: "var(--score-warning)",
  Kritisch: "var(--score-critical)",
  Unbekannt: "var(--score-unknown)",
};

export const RECOMMENDATION_TONE_COLOR: Record<"green" | "yellow" | "red", string> = {
  green: "var(--score-success)",
  yellow: "var(--score-warning)",
  red: "var(--score-critical)",
};

export const RECOMMENDATION_DETAIL_COPY: Record<string, string> = {
  "Premium-Standort": "Premium-Standort: Sofort umsetzbar und höchste Erfolgschance",
  "Sehr guter Standort": "Sehr guter Standort: Hohe Erfolgschance - empfohlen",
  "Guter Standort": "Guter Standort: Optimierung empfohlen - durchführbar",
  "Bedingt geeignet": "Bedingt geeignet: kritisch prüfen - Risiken beachten",
  Unsicher: "Unsicher: alternative Standorte suchen",
};

export type RecommendationCardCopy = {
  title: string;
  text: string;
};

export const RECOMMENDATION_CARD_COPY: Record<string, RecommendationCardCopy> = {
  "Premium-Standort": {
    title: "Premium Standort",
    text: "Sehr gute Voraussetzungen für einen erfolgreichen Betrieb. Hohe Nachfrage, gute Lage und klare Skalierungsmöglichkeiten ermöglichen einen sofortigen Start mit attraktivem Ertragspotenzial.",
  },
  "Sehr guter Standort": {
    title: "Sehr guter Standort",
    text: "Solide Basis mit erkennbarem Wachstumspotenzial. Mit gezielten Optimierungen kann hier ein wirtschaftlich sehr erfolgreicher Betrieb aufgebaut werden.",
  },
  "Guter Standort": {
    title: "Guter Standort",
    text: "Grundsätzlich geeigneter Standort mit Optimierungsbedarf. Durch gezielte Maßnahmen lässt sich die Attraktivität und Wirtschaftlichkeit deutlich steigern.",
  },
  "Bedingt geeignet": {
    title: "Bedingt geeigneter Standort",
    text: "Der Standort ist nutzbar, erfordert jedoch ein durchdachtes Konzept und aktive Vermarktung, um erfolgreich betrieben zu werden.",
  },
  Unsicher: {
    title: "Unsicher: alternative Standorte suchen",
    text: "Aktuell eingeschränkte Voraussetzungen für einen wirtschaftlichen Betrieb. Vor Umsetzung sind grundlegende Anpassungen oder Alternativen zu prüfen.",
  },
};

export const DEFAULT_RECOMMENDATION_CARD: RecommendationCardCopy = {
  title: "Unsicher: alternative Standorte suchen",
  text: "Aktuell eingeschränkte Voraussetzungen für einen wirtschaftlichen Betrieb. Vor Umsetzung sind grundlegende Anpassungen oder Alternativen zu prüfen.",
};
