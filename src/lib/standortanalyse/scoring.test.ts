import { describe, expect, it } from "vitest";

import { calculateStandortScore } from "@/lib/standortanalyse/scoring";

describe("calculateStandortScore", () => {
  it("calculates max score and premium recommendation", () => {
    const result = calculateStandortScore({
      standortfrequentierung: 25,
      gastronomie: 10,
      bekanntheit: 15,
      zugaenglichkeit: 10,
      saisonlaenge: 10,
      wassertemperatur: 5,
      sonnenstunden: 5,
      einwohner: 10,
      besucherstatistiken: 5,
      attraktivitaet: 12,
      wettbewerb: 5,
      wasserzugang: 5,
      genehmigungslage: 5,
      sichtbarkeit: 5,
      erweiterbarkeit: 3,
      lokalerPartner: 2,
      marketingpotenzial: 3,
    });

    expect(result.totalPoints).toBe(135);
    expect(result.recommendation.label).toBe("Premium-Standort");
    expect(result.criterionEvaluations.every((criterion) => criterion.status === "Gut")).toBe(true);
  });

  it("counts unknown values and keeps unsicher recommendation", () => {
    const result = calculateStandortScore({
      standortfrequentierung: 1,
      gastronomie: 1,
      bekanntheit: 1,
      zugaenglichkeit: 1,
      saisonlaenge: 1,
      wassertemperatur: 1,
      sonnenstunden: 1,
      einwohner: 1,
      besucherstatistiken: 1,
      attraktivitaet: 1,
      wettbewerb: 1,
      wasserzugang: 1,
      genehmigungslage: 1,
      sichtbarkeit: 1,
      erweiterbarkeit: 1,
      lokalerPartner: 1,
      marketingpotenzial: 1,
    });

    expect(result.unknownCount).toBe(17);
    expect(result.recommendation.label).toBe("Unsicher");
    expect(result.criterionEvaluations.every((criterion) => criterion.isUnknown)).toBe(true);
  });
});
