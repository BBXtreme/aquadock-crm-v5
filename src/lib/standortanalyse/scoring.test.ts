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

  it("maps threshold boundaries to the expected recommendation labels", () => {
    const baseCriteria = {
      standortfrequentierung: 20,
      gastronomie: 8,
      bekanntheit: 12,
      zugaenglichkeit: 8,
      saisonlaenge: 8,
      wassertemperatur: 4,
      sonnenstunden: 4,
      einwohner: 8,
      besucherstatistiken: 4,
      attraktivitaet: 10,
      wettbewerb: 4,
      wasserzugang: 4,
      genehmigungslage: 4,
      sichtbarkeit: 4,
      erweiterbarkeit: 2,
      lokalerPartner: 2,
      marketingpotenzial: 2,
    };

    const premium = calculateStandortScore({
      ...baseCriteria,
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
    expect(premium.totalPoints).toBe(135);
    expect(premium.recommendation.label).toBe("Premium-Standort");

    const sehrGut = calculateStandortScore(baseCriteria);
    expect(sehrGut.totalPoints).toBe(108);
    expect(sehrGut.recommendation.label).toBe("Sehr guter Standort");

    const gut = calculateStandortScore({
      standortfrequentierung: 13,
      gastronomie: 5,
      bekanntheit: 8,
      zugaenglichkeit: 5,
      saisonlaenge: 5,
      wassertemperatur: 3,
      sonnenstunden: 3,
      einwohner: 5,
      besucherstatistiken: 3,
      attraktivitaet: 7,
      wettbewerb: 3,
      wasserzugang: 3,
      genehmigungslage: 3,
      sichtbarkeit: 3,
      erweiterbarkeit: 1,
      lokalerPartner: 1,
      marketingpotenzial: 1,
    });
    expect(gut.totalPoints).toBe(72);
    expect(gut.recommendation.label).toBe("Guter Standort");

    const bedingt = calculateStandortScore({
      standortfrequentierung: 10,
      gastronomie: 4,
      bekanntheit: 7,
      zugaenglichkeit: 4,
      saisonlaenge: 4,
      wassertemperatur: 2,
      sonnenstunden: 2,
      einwohner: 4,
      besucherstatistiken: 2,
      attraktivitaet: 5,
      wettbewerb: 2,
      wasserzugang: 2,
      genehmigungslage: 2,
      sichtbarkeit: 2,
      erweiterbarkeit: 1,
      lokalerPartner: 1,
      marketingpotenzial: 1,
    });
    expect(bedingt.totalPoints).toBe(55);
    expect(bedingt.recommendation.label).toBe("Bedingt geeignet");

    const unsicher = calculateStandortScore({
      standortfrequentierung: 5,
      gastronomie: 2,
      bekanntheit: 3,
      zugaenglichkeit: 2,
      saisonlaenge: 2,
      wassertemperatur: 1,
      sonnenstunden: 1,
      einwohner: 2,
      besucherstatistiken: 1,
      attraktivitaet: 2,
      wettbewerb: 1,
      wasserzugang: 1,
      genehmigungslage: 1,
      sichtbarkeit: 1,
      erweiterbarkeit: 0,
      lokalerPartner: 0,
      marketingpotenzial: 0,
    });
    expect(unsicher.totalPoints).toBe(25);
    expect(unsicher.recommendation.label).toBe("Unsicher");
  });
});
