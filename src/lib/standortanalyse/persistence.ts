import {
  LEGACY_GEWAESSERART_BY_INDEX,
  normalizeGewaesserartValue,
  type WassertypAllowedValue,
} from "@/lib/constants/wassertyp";
import type { StandortanalyseForm } from "@/lib/validations/standortanalyse";
import type {
  Standortanalyse,
  StandortanalyseInsert,
  StandortanalyseScore,
  StandortanalyseScoreInsert,
  StandortanalyseUpdate,
} from "@/types/database.types";
import { standortKriterien } from "./criteria";
import type { StandortAnalyseScoreResult } from "./scoring";
import { calculateStandortScore } from "./scoring";

const ALLOWED_SCORE_STATUSES = new Set(["Gut", "Mittel", "Kritisch"]);
const INFO_ROW_STATUS_PLACEHOLDER = "Gut";

function resolveGewaesserartFromScoreRow(args: {
  points: number;
  statusLabel: string | null;
  options: readonly { label: string; points: number }[];
}): WassertypAllowedValue {
  if (args.statusLabel != null && !ALLOWED_SCORE_STATUSES.has(args.statusLabel)) {
    const fromStatus = normalizeGewaesserartValue(args.statusLabel);
    if (fromStatus != null) {
      return fromStatus;
    }
  }

  if (
    args.statusLabel == null &&
    args.points >= 0 &&
    args.points < LEGACY_GEWAESSERART_BY_INDEX.length
  ) {
    const legacyLabel = LEGACY_GEWAESSERART_BY_INDEX[args.points];
    const fromLegacy = normalizeGewaesserartValue(legacyLabel);
    if (fromLegacy != null) {
      return fromLegacy;
    }
  }

  const fromCurrentIndex = args.options[args.points]?.label;
  if (fromCurrentIndex != null) {
    const normalized = normalizeGewaesserartValue(fromCurrentIndex);
    if (normalized != null) {
      return normalized;
    }
  }

  const fallback = args.options[0]?.label ?? "See";
  return normalizeGewaesserartValue(fallback) ?? "See";
}

function getInviteDraftFormTemplate(): StandortanalyseForm {
  const now = new Date();
  return {
    kontakt: {
      name: "Interessent",
      vorname: "Unbekannt",
      email: `pending-${now.getTime()}@aquadock.invalid`,
      strasse: null,
      plz: null,
      ort: null,
      telefon: null,
      firma: null,
    },
    standort: {
      plz: "00000",
      ort: "Offen",
      strasse: null,
      land: "DE",
      datum: now.toISOString().slice(0, 10),
      erstelltVon: null,
    },
    kriterien: {
      gewaesserart: "See",
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
    },
    notizen: "Draft für externe Standortanalyse-Einladung erstellt.",
  };
}

export function toStandortanalyseInsert(
  userId: string,
  formData: StandortanalyseForm,
  score: StandortAnalyseScoreResult,
): StandortanalyseInsert {
  return {
    user_id: userId,
    kontakt_name: formData.kontakt.name,
    kontakt_vorname: formData.kontakt.vorname,
    kontakt_email: formData.kontakt.email,
    kontakt_strasse: formData.kontakt.strasse ?? null,
    kontakt_plz: formData.kontakt.plz ?? null,
    kontakt_ort: formData.kontakt.ort ?? null,
    kontakt_telefon: formData.kontakt.telefon ?? null,
    kontakt_firma: formData.kontakt.firma ?? null,
    standort_plz: formData.standort.plz,
    standort_ort: formData.standort.ort,
    standort_strasse: formData.standort.strasse ?? null,
    standort_land: formData.standort.land,
    standort_datum: formData.standort.datum,
    erstellt_von: formData.standort.erstelltVon ?? null,
    notizen: formData.notizen ?? null,
    total_points: score.totalPoints,
    recommendation: score.recommendation.label,
    status: "draft",
  };
}

export function toStandortanalyseUpdate(
  formData: StandortanalyseForm,
  score: StandortAnalyseScoreResult,
): StandortanalyseUpdate {
  return {
    kontakt_name: formData.kontakt.name,
    kontakt_vorname: formData.kontakt.vorname,
    kontakt_email: formData.kontakt.email,
    kontakt_strasse: formData.kontakt.strasse ?? null,
    kontakt_plz: formData.kontakt.plz ?? null,
    kontakt_ort: formData.kontakt.ort ?? null,
    kontakt_telefon: formData.kontakt.telefon ?? null,
    kontakt_firma: formData.kontakt.firma ?? null,
    standort_plz: formData.standort.plz,
    standort_ort: formData.standort.ort,
    standort_strasse: formData.standort.strasse ?? null,
    standort_land: formData.standort.land,
    standort_datum: formData.standort.datum,
    erstellt_von: formData.standort.erstelltVon ?? null,
    notizen: formData.notizen ?? null,
    total_points: score.totalPoints,
    recommendation: score.recommendation.label,
  };
}

export function toStandortanalyseScoresInsert(
  analysisId: string,
  score: StandortAnalyseScoreResult,
  formData: StandortanalyseForm,
): StandortanalyseScoreInsert[] {
  const evalById = new Map(score.criterionEvaluations.map((criterion) => [criterion.id, criterion]));
  const rows: StandortanalyseScoreInsert[] = [];

  for (const definition of standortKriterien) {
    const selectedRaw = formData.kriterien[definition.id as keyof StandortanalyseForm["kriterien"]];
    if (definition.type === "info") {
      const selectedLabel = typeof selectedRaw === "string" ? selectedRaw : definition.options[0]?.label;
      const canonicalLabel =
        selectedLabel != null ? (normalizeGewaesserartValue(selectedLabel) ?? selectedLabel) : "See";
      const optionIndex = definition.options.findIndex((option) => option.label === canonicalLabel);
      const resolvedIndex = optionIndex >= 0 ? optionIndex : 0;
      rows.push({
        analysis_id: analysisId,
        criterion_key: definition.id,
        criterion_type: definition.type,
        points: resolvedIndex,
        max_points: 0,
        // Keep DB compatibility: older schemas restrict status to traffic-light enums.
        // Info rows restore the selected water type from `points` index.
        status: INFO_ROW_STATUS_PLACEHOLDER,
        is_unknown: false,
      });
      continue;
    }

    const evaluation = evalById.get(definition.id);
    rows.push({
      analysis_id: analysisId,
      criterion_key: definition.id,
      criterion_type: definition.type,
      points: Number(selectedRaw ?? evaluation?.points ?? 0),
      max_points: definition.maxPoints,
      status: evaluation?.status ?? null,
      is_unknown: evaluation?.isUnknown ?? false,
    });
  }

  return rows;
}

export function createInviteDraftPayload(userId: string): {
  analysisInsert: StandortanalyseInsert;
  scoreRowsWithoutAnalysisId: Omit<StandortanalyseScoreInsert, "analysis_id">[];
} {
  const template = getInviteDraftFormTemplate();
  const score = calculateStandortScore(template.kriterien);
  return {
    analysisInsert: toStandortanalyseInsert(userId, template, score),
    scoreRowsWithoutAnalysisId: toStandortanalyseScoresInsert(
      "00000000-0000-4000-8000-000000000000",
      score,
      template,
    ).map(({ analysis_id: _analysisId, ...row }) => row),
  };
}

function toDefaultForm(): StandortanalyseForm {
  return {
    kontakt: {
      name: "",
      vorname: "",
      email: "",
      strasse: null,
      plz: null,
      ort: null,
      telefon: null,
      firma: null,
    },
    standort: {
      plz: "",
      ort: "",
      strasse: null,
      land: "DE",
      datum: new Date().toISOString().slice(0, 10),
      erstelltVon: null,
    },
    kriterien: {
      gewaesserart: "See",
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
    },
    notizen: null,
  };
}

export function toStandortanalyseFormFromRows(args: {
  analysis: Standortanalyse;
  scores: StandortanalyseScore[];
}): StandortanalyseForm {
  const base = toDefaultForm();

  base.kontakt.name = args.analysis.kontakt_name;
  base.kontakt.vorname = args.analysis.kontakt_vorname;
  base.kontakt.email = args.analysis.kontakt_email;
  base.kontakt.strasse = args.analysis.kontakt_strasse;
  base.kontakt.plz = args.analysis.kontakt_plz;
  base.kontakt.ort = args.analysis.kontakt_ort;
  base.kontakt.telefon = args.analysis.kontakt_telefon;
  base.kontakt.firma = args.analysis.kontakt_firma;

  base.standort.plz = args.analysis.standort_plz;
  base.standort.ort = args.analysis.standort_ort;
  base.standort.strasse = args.analysis.standort_strasse;
  base.standort.land = args.analysis.standort_land;
  base.standort.datum = args.analysis.standort_datum;
  base.standort.erstelltVon = args.analysis.erstellt_von;
  base.notizen = args.analysis.notizen;

  for (const row of args.scores) {
    if (!(row.criterion_key in base.kriterien)) {
      continue;
    }
    if (row.criterion_key === "gewaesserart") {
      const definition = standortKriterien.find((criterion) => criterion.id === "gewaesserart");
      const statusLabel = typeof row.status === "string" ? row.status : null;
      const options = definition?.options ?? [];
      base.kriterien.gewaesserart = resolveGewaesserartFromScoreRow({
        points: row.points,
        statusLabel,
        options,
      });
      continue;
    }
    const mutable = base.kriterien as Record<string, number | string>;
    mutable[row.criterion_key] = row.points;
  }

  return base;
}
