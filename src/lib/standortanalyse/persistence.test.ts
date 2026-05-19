import { describe, expect, it } from "vitest";
import type { Standortanalyse, StandortanalyseScore } from "@/types/database.types";
import {
  createInviteDraftPayload,
  toStandortanalyseFormFromRows,
  toStandortanalyseInsert,
  toStandortanalyseScoresInsert,
  toStandortanalyseUpdate,
} from "./persistence";
import { calculateStandortScore } from "./scoring";

const baseForm = {
  kontakt: {
    name: "Mustermann",
    vorname: "Max",
    email: "max@example.com",
    strasse: "Musterweg 1",
    plz: "10115",
    ort: "Berlin",
    telefon: "+49 171 1234567",
    firma: "AquaDock Partner GmbH",
  },
  standort: {
    plz: "10115",
    ort: "Berlin",
    strasse: "Hafenstraße 7",
    land: "DE",
    datum: "2026-05-18",
    erstelltVon: "CRM User",
  },
  kriterien: {
    gewaesserart: "Fluss" as const,
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
  },
  notizen: "Hinweis",
};

describe("standortanalyse/persistence", () => {
  it("maps insert and update payload from form + score", () => {
    const score = calculateStandortScore(baseForm.kriterien);
    const insertPayload = toStandortanalyseInsert("user-1", baseForm, score);
    const updatePayload = toStandortanalyseUpdate(baseForm, score);

    expect(insertPayload.kontakt_email).toBe("max@example.com");
    expect(insertPayload.standort_ort).toBe("Berlin");
    expect(insertPayload.total_points).toBe(score.totalPoints);
    expect(updatePayload.recommendation).toBe(score.recommendation.label);
  });

  it("keeps gewaesserart selection lossless in score rows while keeping DB-safe status values", () => {
    const score = calculateStandortScore(baseForm.kriterien);
    const scoreRows = toStandortanalyseScoresInsert("analysis-1", score, baseForm);
    const infoRow = scoreRows.find((row) => row.criterion_key === "gewaesserart");
    const allowedStatuses = new Set(["Gut", "Mittel", "Kritisch"]);

    expect(infoRow?.status).toBe("Gut");
    expect(infoRow?.points).toBe(1);
    expect(infoRow?.criterion_type).toBe("info");
    for (const row of scoreRows) {
      if (row.criterion_key === "gewaesserart") {
        continue;
      }
      expect(row.status == null || allowedStatuses.has(row.status)).toBe(true);
    }
  });

  it("restores form data from analysis and score rows", () => {
    const score = calculateStandortScore(baseForm.kriterien);
    const analysisRow: Standortanalyse = {
      id: "analysis-1",
      user_id: "user-1",
      contact_id: null,
      company_id: null,
      created_at: "2026-05-18T10:00:00.000Z",
      updated_at: "2026-05-18T10:00:00.000Z",
      submitted_at: null,
      status: "draft",
      total_points: score.totalPoints,
      recommendation: score.recommendation.label,
      kontakt_name: baseForm.kontakt.name,
      kontakt_vorname: baseForm.kontakt.vorname,
      kontakt_email: baseForm.kontakt.email,
      kontakt_strasse: baseForm.kontakt.strasse,
      kontakt_plz: baseForm.kontakt.plz,
      kontakt_ort: baseForm.kontakt.ort,
      kontakt_telefon: baseForm.kontakt.telefon,
      kontakt_firma: baseForm.kontakt.firma,
      standort_plz: baseForm.standort.plz,
      standort_ort: baseForm.standort.ort,
      standort_strasse: baseForm.standort.strasse,
      standort_land: baseForm.standort.land,
      standort_datum: baseForm.standort.datum,
      erstellt_von: baseForm.standort.erstelltVon,
      notizen: baseForm.notizen,
    };
    const scoreRows = toStandortanalyseScoresInsert("analysis-1", score, baseForm) as StandortanalyseScore[];

    const restored = toStandortanalyseFormFromRows({
      analysis: analysisRow,
      scores: scoreRows,
    });

    expect(restored.kriterien.gewaesserart).toBe("Fluss");
    expect(restored.kriterien.standortfrequentierung).toBe(25);
    expect(restored.kontakt.email).toBe("max@example.com");
  });

  it("builds invite draft payload with placeholder contact email", () => {
    const draft = createInviteDraftPayload("user-1");
    expect(draft.analysisInsert.user_id).toBe("user-1");
    expect(draft.analysisInsert.kontakt_email).toContain("@aquadock.invalid");
    expect(draft.scoreRowsWithoutAnalysisId.length).toBeGreaterThan(0);
    expect(draft.scoreRowsWithoutAnalysisId[0]).not.toHaveProperty("analysis_id");
  });

  it("restores gewaesserart from stored status label on score row", () => {
    const score = calculateStandortScore(baseForm.kriterien);
    const analysisRow: Standortanalyse = {
      id: "analysis-1",
      user_id: "user-1",
      contact_id: null,
      company_id: null,
      created_at: "2026-05-18T10:00:00.000Z",
      updated_at: "2026-05-18T10:00:00.000Z",
      submitted_at: null,
      status: "draft",
      total_points: score.totalPoints,
      recommendation: score.recommendation.label,
      kontakt_name: baseForm.kontakt.name,
      kontakt_vorname: baseForm.kontakt.vorname,
      kontakt_email: baseForm.kontakt.email,
      kontakt_strasse: baseForm.kontakt.strasse,
      kontakt_plz: baseForm.kontakt.plz,
      kontakt_ort: baseForm.kontakt.ort,
      kontakt_telefon: baseForm.kontakt.telefon,
      kontakt_firma: baseForm.kontakt.firma,
      standort_plz: baseForm.standort.plz,
      standort_ort: baseForm.standort.ort,
      standort_strasse: baseForm.standort.strasse,
      standort_land: baseForm.standort.land,
      standort_datum: baseForm.standort.datum,
      erstellt_von: baseForm.standort.erstelltVon,
      notizen: baseForm.notizen,
    };

    const restored = toStandortanalyseFormFromRows({
      analysis: analysisRow,
      scores: [
        {
          analysis_id: "analysis-1",
          criterion_key: "gewaesserart",
          criterion_type: "info",
          points: 0,
          max_points: 0,
          status: "Fluss",
          is_unknown: false,
        } as StandortanalyseScore,
      ],
    });

    expect(restored.kriterien.gewaesserart).toBe("Fluss");
  });

  it("restores gewaesserart from legacy index when status is null", () => {
    const score = calculateStandortScore(baseForm.kriterien);
    const analysisRow: Standortanalyse = {
      id: "analysis-1",
      user_id: "user-1",
      contact_id: null,
      company_id: null,
      created_at: "2026-05-18T10:00:00.000Z",
      updated_at: "2026-05-18T10:00:00.000Z",
      submitted_at: null,
      status: "draft",
      total_points: score.totalPoints,
      recommendation: score.recommendation.label,
      kontakt_name: baseForm.kontakt.name,
      kontakt_vorname: baseForm.kontakt.vorname,
      kontakt_email: baseForm.kontakt.email,
      kontakt_strasse: baseForm.kontakt.strasse,
      kontakt_plz: baseForm.kontakt.plz,
      kontakt_ort: baseForm.kontakt.ort,
      kontakt_telefon: baseForm.kontakt.telefon,
      kontakt_firma: baseForm.kontakt.firma,
      standort_plz: baseForm.standort.plz,
      standort_ort: baseForm.standort.ort,
      standort_strasse: baseForm.standort.strasse,
      standort_land: baseForm.standort.land,
      standort_datum: baseForm.standort.datum,
      erstellt_von: baseForm.standort.erstelltVon,
      notizen: baseForm.notizen,
    };

    const restoredSee = toStandortanalyseFormFromRows({
      analysis: analysisRow,
      scores: [
        {
          analysis_id: "analysis-1",
          criterion_key: "gewaesserart",
          criterion_type: "info",
          points: 0,
          max_points: 0,
          status: null,
          is_unknown: false,
        } as StandortanalyseScore,
      ],
    });
    expect(restoredSee.kriterien.gewaesserart).toBe("See");

    const restoredCoast = toStandortanalyseFormFromRows({
      analysis: analysisRow,
      scores: [
        {
          analysis_id: "analysis-1",
          criterion_key: "gewaesserart",
          criterion_type: "info",
          points: 2,
          max_points: 0,
          status: null,
          is_unknown: false,
        } as StandortanalyseScore,
      ],
    });
    expect(restoredCoast.kriterien.gewaesserart).toBe("Küste / Meer");
  });

  it("ignores score rows with unknown criterion keys", () => {
    const score = calculateStandortScore(baseForm.kriterien);
    const analysisRow: Standortanalyse = {
      id: "analysis-1",
      user_id: "user-1",
      contact_id: null,
      company_id: null,
      created_at: "2026-05-18T10:00:00.000Z",
      updated_at: "2026-05-18T10:00:00.000Z",
      submitted_at: null,
      status: "draft",
      total_points: score.totalPoints,
      recommendation: score.recommendation.label,
      kontakt_name: baseForm.kontakt.name,
      kontakt_vorname: baseForm.kontakt.vorname,
      kontakt_email: baseForm.kontakt.email,
      kontakt_strasse: baseForm.kontakt.strasse,
      kontakt_plz: baseForm.kontakt.plz,
      kontakt_ort: baseForm.kontakt.ort,
      kontakt_telefon: baseForm.kontakt.telefon,
      kontakt_firma: baseForm.kontakt.firma,
      standort_plz: baseForm.standort.plz,
      standort_ort: baseForm.standort.ort,
      standort_strasse: baseForm.standort.strasse,
      standort_land: baseForm.standort.land,
      standort_datum: baseForm.standort.datum,
      erstellt_von: baseForm.standort.erstelltVon,
      notizen: baseForm.notizen,
    };

    const restored = toStandortanalyseFormFromRows({
      analysis: analysisRow,
      scores: [
        {
          analysis_id: "analysis-1",
          criterion_key: "unknown_key",
          criterion_type: "main",
          points: 99,
          max_points: 25,
          status: "Gut",
          is_unknown: false,
        } as StandortanalyseScore,
      ],
    });

    expect(restored.kriterien.standortfrequentierung).toBe(1);
  });
});
