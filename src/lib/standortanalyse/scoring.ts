import {
  STANDORTANALYSE_RECOMMENDATION_THRESHOLDS,
  STANDORTANALYSE_TOTAL_MAX_POINTS,
  standortKriterien,
} from "@/lib/standortanalyse/criteria";

export type StandortKriterienScores = Record<string, number | string | null | undefined>;

export type StandortCriterionStatus = "Gut" | "Mittel" | "Kritisch";
export type StandortCriterionDisplayStatus = StandortCriterionStatus | "Unbekannt";

export type StandortRecommendation = {
  label: string;
  tone: "green" | "yellow" | "red";
};

export type StandortCriterionEvaluation = {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  ratio: number;
  status: StandortCriterionStatus;
  displayStatus: StandortCriterionDisplayStatus;
  isUnknown: boolean;
  type: "main" | "optional";
};

export type StandortAnalyseScoreResult = {
  totalPoints: number;
  maxPoints: number;
  totalPercent: number;
  unknownCount: number;
  recommendation: StandortRecommendation;
  criterionEvaluations: StandortCriterionEvaluation[];
  mainCriteriaChart: Array<{
    key: string;
    kriterium: string;
    punkte: number;
    maxPunkte: number;
  }>;
};

function toStatus(ratio: number): StandortCriterionStatus {
  if (ratio >= 0.7) {
    return "Gut";
  }
  if (ratio >= 0.4) {
    return "Mittel";
  }
  return "Kritisch";
}

function getRecommendation(totalPoints: number): StandortRecommendation {
  const fallback = STANDORTANALYSE_RECOMMENDATION_THRESHOLDS[STANDORTANALYSE_RECOMMENDATION_THRESHOLDS.length - 1];
  if (fallback === undefined) {
    return { label: "Unsicher", tone: "red" };
  }
  const threshold =
    STANDORTANALYSE_RECOMMENDATION_THRESHOLDS.find((candidate) => totalPoints >= candidate.minPoints) ?? fallback;

  return {
    label: threshold.label,
    tone: threshold.tone,
  };
}

export function calculateStandortScore(scores: StandortKriterienScores): StandortAnalyseScoreResult {
  let totalPoints = 0;
  let unknownCount = 0;

  const criterionEvaluations: StandortCriterionEvaluation[] = [];
  const mainCriteriaChart: StandortAnalyseScoreResult["mainCriteriaChart"] = [];

  for (const criterion of standortKriterien) {
    if (criterion.type === "info") {
      continue;
    }

    const selectedPoints = Number(scores[criterion.id] ?? 0);
    const clampedPoints = Math.min(criterion.maxPoints, Math.max(0, selectedPoints));
    const isUnknown = clampedPoints === 1;
    const ratio = clampedPoints / criterion.maxPoints;

    totalPoints += clampedPoints;
    if (isUnknown) {
      unknownCount += 1;
    }

    const evaluation: StandortCriterionEvaluation = {
      id: criterion.id,
      label: criterion.label,
      points: clampedPoints,
      maxPoints: criterion.maxPoints,
      ratio,
      status: toStatus(ratio),
      displayStatus: isUnknown ? "Unbekannt" : toStatus(ratio),
      isUnknown,
      type: criterion.type,
    };

    criterionEvaluations.push(evaluation);

    if (criterion.type === "main") {
      mainCriteriaChart.push({
        key: criterion.id,
        kriterium: criterion.label,
        punkte: clampedPoints,
        maxPunkte: criterion.maxPoints,
      });
    }
  }

  return {
    totalPoints,
    maxPoints: STANDORTANALYSE_TOTAL_MAX_POINTS,
    totalPercent: (totalPoints / STANDORTANALYSE_TOTAL_MAX_POINTS) * 100,
    unknownCount,
    recommendation: getRecommendation(totalPoints),
    criterionEvaluations,
    mainCriteriaChart,
  };
}
