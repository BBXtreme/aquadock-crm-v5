"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
  RECOMMENDATION_DETAIL_COPY,
  RECOMMENDATION_TONE_COLOR,
} from "@/components/features/standortanalyse/standortanalyse-report.constants";
import { ChartContainer } from "@/components/ui/chart";

export function ScoreRingGauge({
  value,
  max,
  recommendationLabel,
  recommendationTone,
  animated = true,
}: {
  value: number;
  max: number;
  recommendationLabel: string;
  recommendationTone: "green" | "yellow" | "red";
  animated?: boolean;
}) {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const percent = Math.round(ratio * 100);
  const ringColor = RECOMMENDATION_TONE_COLOR[recommendationTone];

  const chartData = [{ name: "score", value: percent, fill: ringColor }];

  return (
    <div className="mx-auto flex w-full max-w-[320px] flex-col items-center">
      <div className="relative aspect-square w-full">
        <ChartContainer
          config={{ score: { label: "Score" } }}
          className="aspect-square w-full"
          aria-hidden
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius="78%"
            outerRadius="100%"
            barSize={18}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={999}
              background
              isAnimationActive={animated}
              animationDuration={650}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ChartContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          role="img"
          aria-label={`Gesamtbewertung: ${value} von ${max} Punkten (${percent} Prozent)`}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Standort-Score
          </span>
          <span className="mt-1 text-5xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </span>
          <span className="mt-0.5 text-sm text-muted-foreground tabular-nums">
            / {max} Punkte · {percent}%
          </span>
        </div>
      </div>
      <p className="mt-4 text-center text-sm font-medium text-foreground">
        {RECOMMENDATION_DETAIL_COPY[recommendationLabel] ?? recommendationLabel}
      </p>
    </div>
  );
}

export function RecommendationPanel({
  title,
  text,
  tone,
  unknownCount,
  analysisId,
}: {
  title: string;
  text: string;
  tone: "green" | "yellow" | "red";
  unknownCount: number;
  analysisId: string | null;
}) {
  const accent = RECOMMENDATION_TONE_COLOR[tone];
  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        backgroundColor: `color-mix(in oklch, ${accent} 8%, var(--card))`,
        borderColor: `color-mix(in oklch, ${accent} 28%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Aquadock Empfehlung
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <dl className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <dt>Unbekannt markierte Kriterien</dt>
          <dd className="font-medium tabular-nums text-foreground">{unknownCount}</dd>
        </div>
        {analysisId ? (
          <div className="flex items-center gap-1.5">
            <dt>Analyse-ID</dt>
            <dd className="font-mono text-[11px] text-foreground/80">{analysisId}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
