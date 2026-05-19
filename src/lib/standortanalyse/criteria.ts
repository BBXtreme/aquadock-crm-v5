import { wassertypOptions } from "@/lib/constants/wassertyp";

export type StandortKriteriumType = "info" | "main" | "optional";

export type StandortKriteriumDefinition = {
  id: string;
  label: string;
  type: StandortKriteriumType;
  maxPoints: number;
  tooltip: string;
  options: readonly {
    label: string;
    points: number;
  }[];
};

export const STANDORTANALYSE_TOTAL_MAX_POINTS = 135;

export const STANDORTANALYSE_RECOMMENDATION_THRESHOLDS = [
  { minPoints: 115, label: "Premium-Standort", tone: "green" as const },
  { minPoints: 95, label: "Sehr guter Standort", tone: "yellow" as const },
  { minPoints: 70, label: "Guter Standort", tone: "yellow" as const },
  { minPoints: 50, label: "Bedingt geeignet", tone: "red" as const },
  { minPoints: 0, label: "Unsicher", tone: "red" as const },
] as const;

export const standortKriterien = [
  {
    id: "gewaesserart",
    label: "Art des Gewässers",
    type: "info",
    maxPoints: 0,
    tooltip: "Nur zur Einordnung, ohne Punktebewertung.",
    options: wassertypOptions.map((option) => ({
      label: option.value,
      points: 0,
    })),
  },
  {
    id: "standortfrequentierung",
    label: "Standortfrequentierung",
    type: "main",
    maxPoints: 25,
    tooltip: "Regelmäßige Besucherzahl am Standort.",
    options: [
      { label: "Sehr hoch", points: 25 },
      { label: "Hoch", points: 18 },
      { label: "Mittel", points: 10 },
      { label: "Niedrig", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "gastronomie",
    label: "Gastronomie",
    type: "main",
    maxPoints: 10,
    tooltip: "Restaurants, Bars und Bewirtung in der Nähe.",
    options: [
      { label: "Sehr gut", points: 10 },
      { label: "Gut", points: 6 },
      { label: "Eingeschränkt", points: 3 },
      { label: "Nicht vorhanden", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "bekanntheit",
    label: "Bekanntheit",
    type: "main",
    maxPoints: 15,
    tooltip: "Bekanntheit als Ausflugs- oder Freizeitstandort.",
    options: [
      { label: "Überregional", points: 15 },
      { label: "Regional", points: 10 },
      { label: "Lokal", points: 5 },
      { label: "Keine Relevanz", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "zugaenglichkeit",
    label: "Zugänglichkeit",
    type: "main",
    maxPoints: 10,
    tooltip: "Erreichbarkeit mit Auto, ÖPNV und zu Fuß.",
    options: [
      { label: "Perfekt erreichbar", points: 10 },
      { label: "Gut erreichbar", points: 7 },
      { label: "Eingeschränkt", points: 3 },
      { label: "Schwer erreichbar", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "saisonlaenge",
    label: "Saisonlänge",
    type: "main",
    maxPoints: 10,
    tooltip: "Nutzbare Monate pro Jahr.",
    options: [
      { label: "7 Monate oder mehr", points: 10 },
      { label: "5 bis 6 Monate", points: 7 },
      { label: "3 bis 4 Monate", points: 4 },
      { label: "Unter 3 Monaten", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "wassertemperatur",
    label: "Wassertemperatur",
    type: "main",
    maxPoints: 5,
    tooltip: "Durchschnittliche Wassertemperatur in der Saison.",
    options: [
      { label: "21°C oder mehr", points: 5 },
      { label: "18 bis 20°C", points: 3 },
      { label: "Unter 18°C", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "sonnenstunden",
    label: "Sonnenstunden",
    type: "main",
    maxPoints: 5,
    tooltip: "Jährliche Sonnenstunden für Wetterattraktivität.",
    options: [
      { label: "1900 Stunden oder mehr", points: 5 },
      { label: "1700 bis 1899 Stunden", points: 3 },
      { label: "Unter 1700 Stunden", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "einwohner",
    label: "Einwohner",
    type: "main",
    maxPoints: 10,
    tooltip: "Einwohner im relevanten Einzugsgebiet.",
    options: [
      { label: "100.000 oder mehr", points: 10 },
      { label: "30.000 bis 99.999", points: 7 },
      { label: "10.000 bis 29.999", points: 4 },
      { label: "Unter 10.000", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "besucherstatistiken",
    label: "Besucherstatistiken",
    type: "main",
    maxPoints: 5,
    tooltip: "Verfügbarkeit belastbarer Besucherdaten.",
    options: [
      { label: "Konkrete Zahlen vorhanden", points: 5 },
      { label: "Teilweise vorhanden", points: 3 },
      { label: "Keine Daten", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "attraktivitaet",
    label: "Attraktivität Wasserstraße/Standort",
    type: "main",
    maxPoints: 12,
    tooltip: "Visuelle und funktionale Attraktivität des Standorts.",
    options: [
      { label: "Sehr hoch", points: 12 },
      { label: "Hoch", points: 9 },
      { label: "Mittel", points: 6 },
      { label: "Gering", points: 3 },
      { label: "Sehr gering", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "wettbewerb",
    label: "Wettbewerb",
    type: "optional",
    maxPoints: 5,
    tooltip: "Wettbewerbsdruck im Umfeld.",
    options: [
      { label: "Keine/Schwach", points: 5 },
      { label: "Wenig", points: 3 },
      { label: "Stark/Gesättigt", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "wasserzugang",
    label: "Wasserzugang",
    type: "optional",
    maxPoints: 5,
    tooltip: "Qualität und Sicherheit des Wasserzugangs.",
    options: [
      { label: "Sehr gut", points: 5 },
      { label: "Gut", points: 3 },
      { label: "Erschwert", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "genehmigungslage",
    label: "Genehmigungslage",
    type: "optional",
    maxPoints: 5,
    tooltip: "Rechtliche Machbarkeit am Standort.",
    options: [
      { label: "Einfach", points: 5 },
      { label: "Moderat", points: 3 },
      { label: "Schwierig", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "sichtbarkeit",
    label: "Sichtbarkeit",
    type: "optional",
    maxPoints: 5,
    tooltip: "Präsenz und Wahrnehmbarkeit im öffentlichen Raum.",
    options: [
      { label: "Sehr hoch", points: 5 },
      { label: "Gut", points: 3 },
      { label: "Gering", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "erweiterbarkeit",
    label: "Erweiterbarkeit",
    type: "optional",
    maxPoints: 3,
    tooltip: "Potenzial für Ausbau und Skalierung.",
    options: [
      { label: "Sehr gut", points: 3 },
      { label: "Bedingt", points: 2 },
      { label: "Kaum möglich", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "lokalerPartner",
    label: "Lokaler Partner",
    type: "optional",
    maxPoints: 2,
    tooltip: "Verfügbarkeit lokaler Unterstützungspartner.",
    options: [
      { label: "Aktiv vorhanden", points: 2 },
      { label: "Nicht vorhanden", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
  {
    id: "marketingpotenzial",
    label: "Marketingpotenzial",
    type: "optional",
    maxPoints: 3,
    tooltip: "Potenzial für lokale und digitale Vermarktung.",
    options: [
      { label: "Sehr hoch", points: 3 },
      { label: "Gut", points: 2 },
      { label: "Gering", points: 0 },
      { label: "Unbekannt", points: 1 },
    ],
  },
] as const satisfies readonly StandortKriteriumDefinition[];
