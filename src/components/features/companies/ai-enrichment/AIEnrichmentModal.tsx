// AI enrichment modal — review-only suggestions (Perplexity-backed research).

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { researchCompanyEnrichment } from "@/lib/actions/company-enrichment";
import { getAiEnrichmentSettingsSnapshot } from "@/lib/actions/settings";
import { formatAiEnrichmentSummaryForDisplay } from "@/lib/ai/ai-enrichment-display";
import type { EnrichmentModelMode } from "@/lib/ai/company-enrichment-gateway";
import { useT } from "@/lib/i18n/use-translations";
import type { CompanyForm } from "@/lib/validations/company";
import {
  type CompanyEnrichmentResult,
  ENRICHMENT_FIELD_KEYS,
  type EnrichmentFieldKey,
  type SanitizedFieldSuggestion,
} from "@/lib/validations/company-enrichment";
import type { Company } from "@/types/database.types";

function enrichmentFieldTitle(t: ReturnType<typeof useT>, key: EnrichmentFieldKey): string {
  switch (key) {
    case "website":
      return t("detailLabelWebsite");
    case "email":
      return t("detailLabelEmail");
    case "telefon":
      return t("detailLabelTelefon");
    case "strasse":
      return t("detailLabelStrasse");
    case "plz":
      return t("detailLabelPlzStadt");
    case "stadt":
      return t("detailLabelPlzStadt");
    case "bundesland":
      return t("detailLabelBundesland");
    case "land":
      return t("detailLabelLand");
    case "notes":
      return t("detailCrmLabelNotes");
    case "wasserdistanz":
      return t("detailLabelWasserdistanz");
    case "wassertyp":
      return t("detailLabelWassertyp");
    case "firmentyp":
      return t("detailLabelFirmentyp");
    case "kundentyp":
      return t("detailLabelKundentyp");
    default:
      return key;
  }
}

function confidenceBadgeVariant(level: SanitizedFieldSuggestion["confidence"]) {
  if (level === "high") return "default" as const;
  if (level === "medium") return "secondary" as const;
  return "outline" as const;
}

function readCurrent(company: Company, key: EnrichmentFieldKey): string {
  const v = company[key];
  if (v === null || v === undefined) return "—";
  return String(v);
}

function formatSuggested(s: SanitizedFieldSuggestion): string {
  if (s.value === null || s.value === undefined) return "—";
  return String(s.value);
}

function mergeSuggestionValueIntoPatch(
  patch: Partial<CompanyForm>,
  key: EnrichmentFieldKey,
  value: SanitizedFieldSuggestion["value"],
) {
  switch (key) {
    case "website":
      patch.website = value as CompanyForm["website"];
      break;
    case "email":
      patch.email = value as CompanyForm["email"];
      break;
    case "telefon":
      patch.telefon = value as CompanyForm["telefon"];
      break;
    case "strasse":
      patch.strasse = value as CompanyForm["strasse"];
      break;
    case "plz":
      patch.plz = value as CompanyForm["plz"];
      break;
    case "stadt":
      patch.stadt = value as CompanyForm["stadt"];
      break;
    case "bundesland":
      patch.bundesland = value as CompanyForm["bundesland"];
      break;
    case "land":
      patch.land = value as CompanyForm["land"];
      break;
    case "notes":
      patch.notes = value as CompanyForm["notes"];
      break;
    case "wasserdistanz":
      patch.wasserdistanz = value as CompanyForm["wasserdistanz"];
      break;
    case "wassertyp":
      patch.wassertyp = value as CompanyForm["wassertyp"];
      break;
    case "firmentyp":
      patch.firmentyp = value as CompanyForm["firmentyp"];
      break;
    case "kundentyp":
      patch.kundentyp = value as CompanyForm["kundentyp"];
      break;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

type Props = {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPatch: (patch: Partial<CompanyForm>) => void;
};

export function AIEnrichmentModal({ company, open, onOpenChange, onApplyPatch }: Props) {
  const t = useT("companies");
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<Partial<Record<EnrichmentFieldKey, boolean>>>({});
  const [result, setResult] = useState<CompanyEnrichmentResult | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState<EnrichmentModelMode>("auto");
  const modelModeRef = useRef<EnrichmentModelMode>("auto");
  modelModeRef.current = modelMode;
  const runForOpenSessionRef = useRef(false);
  const startTimeoutRef = useRef<number | null>(null);
  const prevOpenRef = useRef(false);

  const usageQuery = useQuery({
    queryKey: ["ai-enrichment-settings-snapshot"],
    queryFn: async () => {
      const res = await getAiEnrichmentSettingsSnapshot();
      if (!res.ok) {
        return null;
      }
      return res.data;
    },
    enabled: open,
    staleTime: 15_000,
  });

  const { mutate, reset, isPending, isSuccess, isError } = useMutation({
    mutationFn: async () => {
      const mode = modelModeRef.current;
      const res = await researchCompanyEnrichment(company.id, {
        modelMode: mode,
      });
      if (!res.ok) {
        throw new Error(res.error);
      }
      return res;
    },
    onSuccess: (res) => {
      setResult(res.data);
      setModelUsed(res.modelUsed);
      const next: Partial<Record<EnrichmentFieldKey, boolean>> = {};
      for (const key of ENRICHMENT_FIELD_KEYS) {
        if (res.data.suggestions[key]) {
          next[key] = false;
        }
      }
      setSelected(next);
    },
    onError: (err) => {
      const code = err instanceof Error ? err.message : "ENRICHMENT_FAILED";
      if (code === "NOT_AUTHENTICATED") {
        toast.error(t("aiEnrich.errorNotAuthenticated"));
      } else if (code === "AI_GATEWAY_MISSING") {
        toast.error(t("aiEnrich.errorNoGateway"));
      } else if (code === "COMPANY_NOT_FOUND") {
        toast.error(t("aiEnrich.errorCompany"));
      } else if (code === "AI_ENRICHMENT_DISABLED") {
        toast.error(t("aiEnrich.errorDisabled"));
      } else if (code === "AI_ENRICHMENT_RATE_LIMIT") {
        toast.error(t("aiEnrich.errorRateLimit"));
      } else {
        toast.error(t("aiEnrich.errorGeneric"));
      }
    },
  });

  const mutateRef = useRef(mutate);
  const resetRef = useRef(reset);
  mutateRef.current = mutate;
  resetRef.current = reset;

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open) {
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      runForOpenSessionRef.current = false;
      if (wasOpen) {
        setProgress(0);
        setResult(null);
        setModelUsed(null);
        setModelMode("auto");
        setSelected({});
      }
      resetRef.current();
      return;
    }
    if (runForOpenSessionRef.current) {
      return undefined;
    }
    let cancelled = false;
    startTimeoutRef.current = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      startTimeoutRef.current = null;
      runForOpenSessionRef.current = true;
      mutateRef.current();
    }, 0);
    return () => {
      cancelled = true;
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!isPending) {
      if (isSuccess) {
        setProgress(100);
      }
      return undefined;
    }
    setProgress(14);
    const id = window.setInterval(() => {
      setProgress((p) => (p < 90 ? p + 5 : p));
    }, 320);
    return () => window.clearInterval(id);
  }, [isPending, isSuccess]);

  const rows: EnrichmentFieldKey[] = result
    ? ENRICHMENT_FIELD_KEYS.filter((k) => result.suggestions[k] !== undefined)
    : [];

  const handleRetry = () => {
    setResult(null);
    setModelUsed(null);
    setSelected({});
    reset();
    mutate();
  };

  const handleApply = () => {
    if (!result) return;
    const patch: Partial<CompanyForm> = {};
    for (const key of rows) {
      if (selected[key] !== true) continue;
      const s = result.suggestions[key];
      if (!s) continue;
      mergeSuggestionValueIntoPatch(patch, key, s.value);
    }
    if (Object.keys(patch).length === 0) {
      toast.message(t("aiEnrich.applyNone"));
      return;
    }
    onApplyPatch(patch);
    toast.success(t("aiEnrich.applyToast"));
    onOpenChange(false);
  };

  const showSkeleton = open && (isPending || (!result && !isError));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,960px)] max-h-[96dvh] min-h-0 w-[calc(100vw-1rem)] max-w-[min(1400px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[min(1400px,calc(100vw-2rem))] sm:rounded-xl">
        <div className="shrink-0 space-y-4 border-border border-b px-6 pt-12 pb-5 sm:px-8 sm:pb-6">
          <DialogHeader className="text-left">
            <DialogTitle>{t("aiEnrich.modalTitle")}</DialogTitle>
            <DialogDescription>{t("aiEnrich.modalDescription")}</DialogDescription>
          </DialogHeader>

          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("aiEnrich.alertTitle")}</AlertTitle>
            <AlertDescription>{t("aiEnrich.disclaimer")}</AlertDescription>
          </Alert>

          {usageQuery.data ? (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 sm:px-5">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {t("aiEnrich.usageHeading")}
              </p>
              <p className="mt-1 text-sm tabular-nums text-foreground">
                {t("aiEnrich.usageLine", {
                  used: usageQuery.data.usedToday,
                  limit: usageQuery.data.dailyLimit,
                })}
              </p>
              <Progress
                value={
                  usageQuery.data.dailyLimit > 0
                    ? Math.min(100, Math.round((usageQuery.data.usedToday / usageQuery.data.dailyLimit) * 100))
                    : 0
                }
                className="mt-2 h-1.5"
                aria-label={t("aiEnrich.usageHeading")}
              />
              {usageQuery.data.addressFocusPrioritize ? (
                <p className="text-muted-foreground mt-2 text-xs leading-snug">{t("aiEnrich.addressFocusActive")}</p>
              ) : null}
            </div>
          ) : null}

          {open && usageQuery.isLoading && !usageQuery.data ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/10 px-4 py-3 sm:px-5">
              <Skeleton key="ai-enrich-usage-skel-line" className="h-4 w-48" />
              <Skeleton key="ai-enrich-usage-skel-bar" className="h-1.5 w-full" />
            </div>
          ) : null}

          <div className="flex flex-row items-start justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3 sm:items-center sm:px-5">
            <div className="flex-1 space-y-1 pr-2">
              <Label htmlFor="ai-enrich-grok-toggle" className="text-sm font-medium">
                {t("aiEnrich.grokToggleLabel")}
              </Label>
              <p className="text-muted-foreground text-xs leading-snug">{t("aiEnrich.grokToggleHint")}</p>
            </div>
            <Switch
              id="ai-enrich-grok-toggle"
              checked={modelMode === "grok_only"}
              onCheckedChange={(checked) => setModelMode(checked ? "grok_only" : "auto")}
              disabled={isPending}
              aria-label={t("aiEnrich.grokToggleLabel")}
              className="shrink-0"
            />
          </div>

          {isError ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                {t("aiEnrich.retry")}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
          {showSkeleton ? (
            <div className="space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-muted-foreground text-sm">{t("aiEnrich.loadingSteps")}</p>
              <div className="space-y-3">
                {[
                  "enrich-skeleton-row-1",
                  "enrich-skeleton-row-2",
                  "enrich-skeleton-row-3",
                  "enrich-skeleton-row-4",
                  "enrich-skeleton-row-5",
                  "enrich-skeleton-row-6",
                ].map((skKey) => (
                  <Skeleton key={skKey} className="h-9 w-full" />
                ))}
              </div>
            </div>
          ) : null}

          {result && !isPending ? (
            <div className="flex flex-col gap-5">
              {result.aiSummary ? (
                <section className="rounded-lg border bg-muted/30 px-4 py-4 text-sm shadow-xs sm:px-5">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t("aiEnrich.summaryLabel")}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap wrap-break-word text-foreground leading-relaxed">
                    {formatAiEnrichmentSummaryForDisplay(result.aiSummary).split("\n").map((line, idx) => (
                      <Fragment key={`ai-sum-${String(idx)}`}>
                        {idx > 0 ? <br /> : null}
                        {line}
                      </Fragment>
                    ))}
                  </p>
                </section>
              ) : null}
              {modelUsed ? (
                <p className="text-muted-foreground text-xs">{t("aiEnrich.modelUsed", { model: modelUsed })}</p>
              ) : null}
              {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("aiEnrich.noSuggestions")}</p>
              ) : (
                <section aria-label={t("aiEnrich.tableField")}>
                  <h3 className="text-foreground mb-2 text-sm font-medium">{t("aiEnrich.suggestionsSectionTitle")}</h3>
                  <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
                    <Table className="min-w-208">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="sticky top-0 z-10 w-10 bg-muted/95 backdrop-blur-sm">
                            {t("aiEnrich.tableSelect")}
                          </TableHead>
                          <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                            {t("aiEnrich.tableField")}
                          </TableHead>
                          <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                            {t("aiEnrich.tableCurrent")}
                          </TableHead>
                          <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                            {t("aiEnrich.tableSuggested")}
                          </TableHead>
                          <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                            {t("aiEnrich.tableConfidence")}
                          </TableHead>
                          <TableHead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                            {t("aiEnrich.tableSources")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((key) => {
                          const s = result.suggestions[key];
                          if (!s) return null;
                          return (
                            <TableRow key={key} className="align-top">
                              <TableCell className="align-middle">
                                <Checkbox
                                  checked={selected[key] === true}
                                  onCheckedChange={(checked) =>
                                    setSelected((prev) => ({ ...prev, [key]: checked === true }))
                                  }
                                  aria-label={t("aiEnrich.tableSelect")}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{enrichmentFieldTitle(t, key)}</TableCell>
                              <TableCell className="max-w-[min(140px,28vw)] wrap-break-word text-muted-foreground text-sm">
                                {readCurrent(company, key)}
                              </TableCell>
                              <TableCell className="max-w-[min(200px,32vw)] wrap-break-word text-sm">
                                {formatSuggested(s)}
                              </TableCell>
                              <TableCell className="align-middle">
                                <Badge variant={confidenceBadgeVariant(s.confidence)}>
                                  {s.confidence === "high"
                                    ? t("aiEnrich.confidenceHigh")
                                    : s.confidence === "medium"
                                      ? t("aiEnrich.confidenceMedium")
                                      : t("aiEnrich.confidenceLow")}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[min(240px,36vw)] text-xs">
                                <ul className="space-y-1.5">
                                  {s.sources.map((src) => (
                                    <li key={src.url}>
                                      <a
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline-offset-4 hover:underline wrap-break-word"
                                      >
                                        {src.title}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 mt-0 flex w-full shrink-0 flex-col gap-3 rounded-none border-border border-t bg-muted/40 px-6 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-3 sm:px-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={handleRetry}
            disabled={isPending}
          >
            {t("aiEnrich.retry")}
          </Button>
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full min-w-0 shrink-0 whitespace-normal sm:w-auto sm:min-w-32"
              onClick={() => onOpenChange(false)}
            >
              {t("aiEnrich.close")}
            </Button>
            <Button
              type="button"
              className="w-full min-w-0 shrink-0 whitespace-normal sm:w-auto sm:min-w-40"
              onClick={handleApply}
              disabled={isPending || !result}
            >
              {t("aiEnrich.apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
