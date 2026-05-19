"use client";

import { MapPinned } from "lucide-react";
import Image from "next/image";
import { forwardRef } from "react";
import { RecommendationPanel, ScoreRingGauge } from "@/components/features/standortanalyse/ScoreRingGauge";
import { CRITERIA_COLORS, type RecommendationCardCopy } from "@/components/features/standortanalyse/standortanalyse-report.constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/use-translations";
import type { StandortAnalyseScoreResult } from "@/lib/standortanalyse/scoring";
import { cn } from "@/lib/utils";
import type { StandortanalyseForm } from "@/lib/validations/standortanalyse";
import "@/components/features/standortanalyse/standortanalyse-report.print.css";

type StandortanalyseReportProps = {
  formValues: StandortanalyseForm;
  score: StandortAnalyseScoreResult;
  recommendationCard: RecommendationCardCopy;
  analysisId: string | null;
  mapEmbedUrl: string | null;
  mapInfo: string;
  mapError: string | null;
  staticMapUrl: string | null;
  variant?: "screen" | "export";
};

function formatReportDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return parsed.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const StandortanalyseReport = forwardRef<HTMLDivElement, StandortanalyseReportProps>(
  (
    {
      formValues,
      score,
      recommendationCard,
      analysisId,
      mapEmbedUrl,
      mapInfo,
      mapError,
      staticMapUrl,
      variant = "screen",
    },
    ref,
  ) => {
    const t = useT("standortanalyse");
    const trimmedNotizen = (formValues.notizen ?? "").trim();
    const isExportVariant = variant === "export";
      const showStaticMap = isExportVariant;

    return (
      <div ref={ref} className={cn("grid gap-6 standortanalyse-report", isExportVariant && "standortanalyse-report--export")}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Auswertung</CardTitle>
            <CardDescription>
              Gesamtbewertung, Empfehlung und Kriterienstati auf einen Blick.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-2 sm:space-y-10">
            <section className="rounded-xl border bg-muted/20 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Analyseübersicht</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    Kontakt: {formValues.kontakt.vorname} {formValues.kontakt.name}
                  </p>
                  <p className="text-muted-foreground">{formValues.kontakt.email}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    Standort: {formValues.standort.plz} {formValues.standort.ort}
                  </p>
                  <p className="text-muted-foreground">
                    {formValues.standort.strasse != null && formValues.standort.strasse.trim() !== ""
                      ? formValues.standort.strasse
                      : "Keine Straße angegeben"}
                  </p>
                  <p className="text-muted-foreground">
                    Datum: {formatReportDate(formValues.standort.datum)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-10">
              <ScoreRingGauge
                value={score.totalPoints}
                max={score.maxPoints}
                recommendationLabel={score.recommendation.label}
                recommendationTone={score.recommendation.tone}
                animated={!isExportVariant}
              />
              <RecommendationPanel
                title={recommendationCard.title}
                text={recommendationCard.text}
                tone={score.recommendation.tone}
                unknownCount={score.unknownCount}
                analysisId={analysisId}
              />
            </section>

            {trimmedNotizen.length > 0 ? (
              <>
                <Separator className="bg-border/60" />
                <section className="space-y-3">
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Notizen / Bemerkungen
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Anmerkungen zum Standort
                    </span>
                  </header>
                  <blockquote className="rounded-xl border-l-2 border-primary/40 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {trimmedNotizen}
                  </blockquote>
                </section>
              </>
            ) : null}

            <Separator className="bg-border/60" />

            <section className="space-y-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Hauptkriterien
                </h3>
                <span className="text-xs text-muted-foreground">
                  Zielerreichung je Hauptkriterium
                </span>
              </header>
              <ul className="divide-y divide-border/60">
                {score.mainCriteriaChart.map((entry) => {
                  const criterion = score.criterionEvaluations.find((item) => item.id === entry.key);
                  const status = criterion?.displayStatus ?? "Kritisch";
                  const safeMax = Math.max(1, entry.maxPunkte);
                  const ratio = Math.min(1, Math.max(0, entry.punkte / safeMax));
                  const percent = Math.round(ratio * 100);
                  const statusColor = CRITERIA_COLORS[status];
                  return (
                    <li
                      key={entry.key}
                      className="grid grid-cols-[1fr_auto] items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: statusColor }}
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {entry.kriterium}
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={entry.punkte}
                          aria-valuemin={0}
                          aria-valuemax={entry.maxPunkte}
                          aria-label={`${entry.kriterium}: ${entry.punkte} von ${entry.maxPunkte} Punkten`}
                        >
                          <div
                            className="h-full rounded-full transition-[width] duration-500 ease-out"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: statusColor,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right text-sm tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{entry.punkte}</span>
                        <span className="mx-0.5">/</span>
                        <span>{entry.maxPunkte}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <Separator className="bg-border/60" />

            <section className="space-y-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Detailansicht
                </h3>
                <span className="text-xs text-muted-foreground">
                  Status je Kriterium inkl. Unbekannt-Markierungen
                </span>
              </header>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Kriterium</TableHead>
                    <TableHead className="w-[120px]">Punkte</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {score.criterionEvaluations.map((criterion) => (
                    <TableRow key={criterion.id}>
                      <TableCell className="font-medium text-foreground">
                        {criterion.label}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span className="font-semibold text-foreground">
                          {criterion.points}
                        </span>
                        <span className="mx-0.5 text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{criterion.maxPoints}</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: CRITERIA_COLORS[criterion.displayStatus],
                            }}
                          />
                          {criterion.displayStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </CardContent>
        </Card>

        <Card className="standortanalyse-report-map">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="h-4 w-4" />
              Standortkarte
            </CardTitle>
            {mapInfo.length > 0 ? <CardDescription>{mapInfo}</CardDescription> : null}
          </CardHeader>
          <CardContent>
            {mapError ? <p className="text-sm text-destructive">{mapError}</p> : null}
            {showStaticMap && staticMapUrl != null ? (
              <Image
                src={staticMapUrl}
                alt="Statische Karte des analysierten Standorts"
                className="h-auto w-full rounded-lg border"
                width={960}
                height={420}
                unoptimized
              />
            ) : null}
            {!isExportVariant && mapEmbedUrl ? (
              <iframe
                title="Standortkarte"
                src={mapEmbedUrl}
                className="h-[360px] w-full rounded-lg border"
                loading="lazy"
              />
            ) : null}
            {!isExportVariant && mapEmbedUrl == null && staticMapUrl == null ? (
              <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/20">
                <div className="relative h-10 w-10">
                  <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                  <span className="absolute inset-2 animate-pulse rounded-full bg-primary/10" />
                </div>
                <p className="text-sm text-muted-foreground">Karte wird geladen...</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">{t("reportFooter")}</p>
      </div>
    );
  },
);

StandortanalyseReport.displayName = "StandortanalyseReport";
