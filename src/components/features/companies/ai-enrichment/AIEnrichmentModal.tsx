// AI enrichment modal — review-only suggestions (Perplexity-backed research).

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { researchCompanyEnrichment } from "@/lib/actions/company-enrichment";
import { getAiEnrichmentSettingsSnapshot } from "@/lib/actions/settings";
import { getVercelAiCredits } from "@/lib/actions/vercel-ai-credits";
import { formatAiEnrichmentSummaryForDisplay } from "@/lib/ai/ai-enrichment-display";
import type { EnrichmentGatewayFailureDiagnostic } from "@/lib/ai/enrichment-gateway-failure-types";
import { getCompanyResearchBadge, getEnrichmentGatewayModelMeta } from "@/lib/constants/ai-models";
import { VERCEL_AI_GATEWAY_DASHBOARD_HREF } from "@/lib/constants/vercel-ai-gateway";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { ENRICHMENT_GATEWAY_MODEL_ID_CHOICES } from "@/lib/services/ai-enrichment-policy";
import type { CompanyForm } from "@/lib/validations/company";
import {
  type CompanyEnrichmentResult,
  ENRICHMENT_FIELD_KEYS,
  type EnrichmentFieldKey,
  type SanitizedFieldSuggestion,
} from "@/lib/validations/company-enrichment";
import type { Company } from "@/types/database.types";

const AI_ENRICHMENT_RATE_PREFIX = "AI_ENRICHMENT_RATE_LIMIT:";

class ResearchCompanyEnrichmentClientError extends Error {
  readonly diagnostic?: EnrichmentGatewayFailureDiagnostic;

  constructor(code: string, diagnostic?: EnrichmentGatewayFailureDiagnostic) {
    super(code);
    this.name = "ResearchCompanyEnrichmentClientError";
    this.diagnostic = diagnostic;
  }
}

type EnrichmentGatewayModelId = (typeof ENRICHMENT_GATEWAY_MODEL_ID_CHOICES)[number];

function isEnrichmentGatewayModelId(value: string): value is EnrichmentGatewayModelId {
  return (ENRICHMENT_GATEWAY_MODEL_ID_CHOICES as readonly string[]).includes(value);
}

function formatUsdCredits(amount: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

type AiEnrichmentUsageSnapshot = { usedToday: number; dailyLimit: number };

/** Heuristic relative cost / token tier for the gateway model (no live usage without gateway changes). */
function enrichmentApproxRelativeCostHint(modelId: string, lowCostMode: boolean | undefined): string | null {
  const lower = modelId.toLowerCase();
  if (
    /grok-4\.1-fast|grok-4-fast|gemini-3-flash|gemini-2\.5-flash|claude-haiku|gpt-5\.4-mini|gpt-5-mini|nano/.test(
      lower,
    )
  ) {
    return "Approximate cost: lower (fast / efficient model).";
  }
  if (/claude-sonnet|claude-opus/.test(lower) || lower === "openai/gpt-5.4") {
    return "Approximate cost: higher (large flagship model).";
  }
  if (lowCostMode === true) {
    return "Low-cost mode: fewer web snippets and compact prompts are active in settings.";
  }
  return null;
}

function parseDailyAiEnrichmentRateLimitError(
  message: string,
): (AiEnrichmentUsageSnapshot & { requested: number }) | null {
  if (!message.startsWith(AI_ENRICHMENT_RATE_PREFIX)) {
    return null;
  }
  const parts = message.slice(AI_ENRICHMENT_RATE_PREFIX.length).split(":");
  const usedToday = Number.parseInt(parts[0] ?? "", 10);
  const dailyLimit = Number.parseInt(parts[1] ?? "", 10);
  const requested = Number.parseInt(parts[2] ?? "", 10);
  if (!Number.isFinite(usedToday) || !Number.isFinite(dailyLimit) || !Number.isFinite(requested)) {
    return null;
  }
  return { usedToday, dailyLimit, requested };
}

function resolveCompanyAiEnrichmentErrorMessage(
  raw: string,
  t: ReturnType<typeof useT>,
  usageFallback: AiEnrichmentUsageSnapshot | null,
): string {
  const limitPayload = parseDailyAiEnrichmentRateLimitError(raw);
  if (limitPayload) {
    const { usedToday, dailyLimit, requested } = limitPayload;
    const hint =
      requested > 1 ? t("aiEnrich.errorDailyLimitBulkHint", { count: requested }) : "";
    return t("aiEnrich.errorDailyLimitDetail", {
      used: usedToday,
      limit: dailyLimit,
      hint,
    });
  }

  if (raw === "AI_ENRICHMENT_RATE_LIMIT") {
    if (usageFallback) {
      return resolveCompanyAiEnrichmentErrorMessage(
        `${AI_ENRICHMENT_RATE_PREFIX}${String(usageFallback.usedToday)}:${String(usageFallback.dailyLimit)}:1`,
        t,
        null,
      );
    }
    return t("aiEnrich.errorRateLimit");
  }

  if (raw === "NOT_AUTHENTICATED") {
    return t("aiEnrich.errorNotAuthenticated");
  }
  if (raw === "AI_GATEWAY_MISSING") {
    return t("aiEnrich.errorNoGateway");
  }
  if (raw === "COMPANY_NOT_FOUND") {
    return t("aiEnrich.errorCompany");
  }
  if (raw === "AI_ENRICHMENT_DISABLED") {
    return `${t("aiEnrich.errorDisabled")}${t("aiEnrich.errorDisabledSettingsHint")}`;
  }
  if (raw === "VERCEL_AI_GATEWAY_CREDITS_EXHAUSTED") {
    return t("aiEnrich.errorVercelGatewayCredits");
  }
  if (raw === "XAI_GROK_QUOTA_EXHAUSTED") {
    return t("aiEnrich.errorXaiGrokQuota");
  }
  if (raw === "AI_GATEWAY_RATE_LIMIT") {
    return t("aiEnrich.errorGatewayRateLimit");
  }
  if (raw === "AI_GATEWAY_UNAVAILABLE") {
    return t("aiEnrich.errorGatewayNetwork");
  }
  if (raw === "ENRICHMENT_NO_OUTPUT") {
    return t("aiEnrich.errorEnrichmentNoOutput");
  }

  return t("aiEnrich.errorGeneric");
}

function modalShowsGrokBilling(
  snapshot:
    | { primaryGatewayModelId: string; lowCostMode?: boolean }
    | null
    | undefined,
): boolean {
  if (!snapshot) {
    return false;
  }
  if (snapshot.lowCostMode === true) {
    return true;
  }
  return snapshot.primaryGatewayModelId.startsWith("xai/");
}

/** Vercel AI Gateway credits when primary is not xAI-only, or low-cost (Gemini path) is on. */
function shouldShowVercelAiCreditsInModal(
  snapshot: { primaryGatewayModelId: string; lowCostMode?: boolean } | null | undefined,
): boolean {
  if (!snapshot) {
    return false;
  }
  if (snapshot.lowCostMode === true) {
    return true;
  }
  return !snapshot.primaryGatewayModelId.startsWith("xai/");
}

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
  const numberLocaleTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<Partial<Record<EnrichmentFieldKey, boolean>>>({});
  const [result, setResult] = useState<CompanyEnrichmentResult | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [enrichmentInlineError, setEnrichmentInlineError] = useState<string | null>(null);
  const [enrichmentFailureDetail, setEnrichmentFailureDetail] = useState<EnrichmentGatewayFailureDiagnostic | null>(
    null,
  );
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
    refetchInterval: open ? 20_000 : false,
    refetchOnWindowFocus: open,
  });

  const showVercelAiCredits = shouldShowVercelAiCreditsInModal(usageQuery.data);

  const snapshotPrimary: EnrichmentGatewayModelId | null =
    usageQuery.data && isEnrichmentGatewayModelId(usageQuery.data.primaryGatewayModelId)
      ? usageQuery.data.primaryGatewayModelId
      : null;

  const xaiBillingContextForBadges = snapshotPrimary?.startsWith("xai/") === true;

  /** Effective routing preview: low-cost → Gemini until `modelUsed` reflects the run; else saved primary or last model. */
  const LOW_COST_PRIMARY_DISPLAY: EnrichmentGatewayModelId = "google/gemini-3-flash";
  const effectiveModelIdForBadge: EnrichmentGatewayModelId | null =
    usageQuery.data?.lowCostMode === true && !(modelUsed && isEnrichmentGatewayModelId(modelUsed))
      ? LOW_COST_PRIMARY_DISPLAY
      : modelUsed && isEnrichmentGatewayModelId(modelUsed)
        ? modelUsed
        : snapshotPrimary;

  const sessionActiveModelLabel = effectiveModelIdForBadge
    ? getEnrichmentGatewayModelMeta(effectiveModelIdForBadge)?.label ?? effectiveModelIdForBadge
    : modelUsed ?? usageQuery.data?.primaryGatewayModelId ?? "—";

  const sessionActiveModelBadge = effectiveModelIdForBadge
    ? getCompanyResearchBadge(effectiveModelIdForBadge, { xaiBillingContext: xaiBillingContextForBadges })
    : null;

  const creditsQuery = useQuery({
    queryKey: ["vercel-ai-gateway-credits"],
    queryFn: getVercelAiCredits,
    enabled: open && showVercelAiCredits,
    staleTime: 60_000,
    refetchInterval: open && showVercelAiCredits ? 120_000 : false,
    refetchOnWindowFocus: open && showVercelAiCredits,
  });

  const { mutate, reset, isPending, isSuccess, isError } = useMutation({
    mutationFn: async () => {
      const res = await researchCompanyEnrichment(company.id, { modelMode: "auto" });
      if (!res.ok) {
        throw new ResearchCompanyEnrichmentClientError(res.error, res.diagnostic);
      }
      return res;
    },
    onSuccess: (res) => {
      setEnrichmentInlineError(null);
      setEnrichmentFailureDetail(null);
      setResult(res.data);
      setModelUsed(res.modelUsed);
      const next: Partial<Record<EnrichmentFieldKey, boolean>> = {};
      for (const key of ENRICHMENT_FIELD_KEYS) {
        if (res.data.suggestions[key]) {
          next[key] = false;
        }
      }
      setSelected(next);
      void queryClient.invalidateQueries({ queryKey: ["ai-enrichment-settings-snapshot"] });
    },
    onError: (err) => {
      const code =
        err instanceof ResearchCompanyEnrichmentClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "ENRICHMENT_FAILED";
      const diagnostic =
        err instanceof ResearchCompanyEnrichmentClientError ? err.diagnostic : undefined;
      setEnrichmentFailureDetail(diagnostic ?? null);
      const usageFallback =
        usageQuery.data !== undefined && usageQuery.data !== null
          ? { usedToday: usageQuery.data.usedToday, dailyLimit: usageQuery.data.dailyLimit }
          : null;
      const msg = resolveCompanyAiEnrichmentErrorMessage(code, t, usageFallback);
      setEnrichmentInlineError(msg);
      toast.error(msg);
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
      setEnrichmentInlineError(null);
      setEnrichmentFailureDetail(null);
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      runForOpenSessionRef.current = false;
      if (wasOpen) {
        setProgress(0);
        setResult(null);
        setModelUsed(null);
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

  const modelCostHint =
    result && !isPending && modelUsed
      ? enrichmentApproxRelativeCostHint(modelUsed, usageQuery.data?.lowCostMode)
      : null;

  const handleRetry = () => {
    setEnrichmentInlineError(null);
    setEnrichmentFailureDetail(null);
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
      <DialogContent className="flex h-[min(90dvh,1000px)] max-h-[95dvh] min-h-0 w-[calc(100vw-1rem)] max-w-[min(1400px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[min(1400px,calc(100vw-2rem))] sm:rounded-xl">
        <div className="shrink-0 space-y-2.5 border-border border-b px-6 pt-14 pb-3 sm:space-y-3 sm:px-8 sm:pt-16 sm:pb-3.5">
          <DialogHeader className="min-w-0 space-y-1.5 pr-16 text-left sm:pr-20">
            <DialogTitle className="wrap-break-word text-balance text-base leading-tight sm:text-lg">
              {t("aiEnrich.modalTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {t("aiEnrich.modalDescription")}
            </DialogDescription>
          </DialogHeader>

          {usageQuery.data ? (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-2.5 sm:px-5 sm:py-3">
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
              {showVercelAiCredits ? (
                creditsQuery.isPending ? (
                  <Skeleton className="mt-2 h-4 w-56" aria-hidden />
                ) : creditsQuery.data?.ok === true ? (
                  <p className="mt-2 text-muted-foreground text-sm tabular-nums leading-snug">
                    {t("aiEnrich.vercelAiCreditsLine", {
                      balance: formatUsdCredits(creditsQuery.data.balance, numberLocaleTag),
                      totalUsed: formatUsdCredits(creditsQuery.data.totalUsed, numberLocaleTag),
                    })}{" "}
                    <a
                      href={VERCEL_AI_GATEWAY_DASHBOARD_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t("aiEnrich.vercelAiGatewayDashboardLink")}
                    </a>
                  </p>
                ) : creditsQuery.data?.ok === false && creditsQuery.data.error === "NOT_CONFIGURED" ? (
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    {t("aiEnrich.vercelAiCreditsNotConfigured")}
                  </p>
                ) : creditsQuery.data?.ok === false ? (
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">{t("aiEnrich.vercelAiCreditsUnavailable")}</p>
                ) : null
              ) : null}
              {usageQuery.data.addressFocusPrioritize ? (
                <p className="text-muted-foreground mt-2 text-xs leading-snug">{t("aiEnrich.addressFocusActive")}</p>
              ) : null}
              {modalShowsGrokBilling(usageQuery.data) ? (
                <p className="text-muted-foreground mt-2 text-xs leading-snug">
                  {t("aiEnrich.grokBillingNotice")}{" "}
                  <a
                    href="https://console.x.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t("aiEnrich.grokConsoleLinkLabel")}
                  </a>
                  .
                </p>
              ) : null}
              <div className="mt-3 flex flex-col gap-3 border-border border-t border-dashed pt-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t("aiEnrich.sessionModelHeading")}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-foreground text-sm tabular-nums">
                    <span className="min-w-0">{sessionActiveModelLabel}</span>
                    {sessionActiveModelBadge ? (
                      <Badge variant={sessionActiveModelBadge.variant} className={sessionActiveModelBadge.className}>
                        {sessionActiveModelBadge.text}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs leading-snug">{t("aiEnrich.sessionModelHint")}</p>
                  {usageQuery.data?.lowCostMode === true ? (
                    <p className="text-muted-foreground text-xs leading-snug">
                      Low-cost mode is on (Settings): Gemini 3 Flash + Grok 4.1 Fast routing, 3 search hits, shorter
                      prompts.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {enrichmentInlineError ? (
            <div
              role="alert"
              className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm leading-snug"
            >
              <p className="font-medium text-destructive">{enrichmentInlineError}</p>
              {enrichmentFailureDetail ? (
                <div className="space-y-1.5 border-destructive/20 border-t border-dashed pt-2 text-muted-foreground">
                  <p className="font-mono text-[11px] leading-snug wrap-break-word">
                    <span className="text-foreground/80">Code:</span> {enrichmentFailureDetail.stableCode}
                    {enrichmentFailureDetail.httpStatus !== undefined ? (
                      <span>
                        {" "}
                        · HTTP {String(enrichmentFailureDetail.httpStatus)}
                      </span>
                    ) : null}
                    {enrichmentFailureDetail.generationId ? (
                      <span>
                        {" "}
                        · gen {enrichmentFailureDetail.generationId}
                      </span>
                    ) : null}
                  </p>
                  {enrichmentFailureDetail.gatewayMessage.length > 0 ? (
                    <p className="max-h-24 overflow-y-auto font-mono text-[11px] leading-snug wrap-break-word opacity-90">
                      {enrichmentFailureDetail.gatewayMessage}
                    </p>
                  ) : null}
                  {enrichmentFailureDetail.stableCode === "VERCEL_AI_GATEWAY_CREDITS_EXHAUSTED" ? (
                    <p className="text-[11px] leading-snug">
                      Add Vercel AI Gateway credits or top up in the dashboard.{" "}
                      <a
                        href={VERCEL_AI_GATEWAY_DASHBOARD_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {t("aiEnrich.vercelAiGatewayDashboardLink")}
                      </a>
                    </p>
                  ) : null}
                  {enrichmentFailureDetail.tokenUsageHint ? (
                    <p className="font-mono text-[11px] leading-snug wrap-break-word opacity-90">
                      Token usage (from gateway): {enrichmentFailureDetail.tokenUsageHint}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {open && usageQuery.isLoading && !usageQuery.data ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/10 px-4 py-2.5 sm:px-5 sm:py-3">
              <Skeleton key="ai-enrich-usage-skel-line" className="h-4 w-48" />
              <Skeleton key="ai-enrich-usage-skel-bar" className="h-1.5 w-full" />
            </div>
          ) : null}

          {isError ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                {t("aiEnrich.retry")}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-6 py-2.5 sm:px-8 sm:py-3">
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
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4">
                {result.aiSummary ? (
                  <section className="shrink-0 rounded-lg border bg-muted/30 px-4 py-3 text-sm shadow-xs sm:px-5 sm:py-3.5">
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
                  <div className="shrink-0 space-y-1">
                    <p className="text-muted-foreground text-xs">
                      {t("aiEnrich.modelUsed", {
                        model: isEnrichmentGatewayModelId(modelUsed)
                          ? getEnrichmentGatewayModelMeta(modelUsed)?.label ?? modelUsed
                          : modelUsed,
                      })}
                    </p>
                    {modelCostHint ? (
                      <p className="text-muted-foreground text-[11px] leading-snug">{modelCostHint}</p>
                    ) : null}
                  </div>
                ) : null}
                {rows.length === 0 ? (
                  <p className="text-muted-foreground shrink-0 text-sm">{t("aiEnrich.noSuggestions")}</p>
                ) : (
                  <section
                    aria-label={t("aiEnrich.tableField")}
                    className="flex min-h-0 min-w-0 flex-1 flex-col gap-2"
                  >
                    <h3 className="text-foreground shrink-0 text-sm font-medium">{t("aiEnrich.suggestionsSectionTitle")}</h3>
                    <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-xs">
                      <Table className="w-full table-fixed">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="sticky top-0 z-10 w-[8%] min-w-0 bg-muted/95 backdrop-blur-sm">
                              {t("aiEnrich.tableSelect")}
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 w-[18%] min-w-0 bg-muted/95 backdrop-blur-sm">
                              {t("aiEnrich.tableField")}
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 w-[18%] min-w-0 bg-muted/95 backdrop-blur-sm">
                              {t("aiEnrich.tableCurrent")}
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 w-[20%] min-w-0 bg-muted/95 backdrop-blur-sm">
                              {t("aiEnrich.tableSuggested")}
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 w-[12%] min-w-0 bg-muted/95 backdrop-blur-sm">
                              {t("aiEnrich.tableConfidence")}
                            </TableHead>
                            <TableHead className="sticky top-0 z-10 w-[24%] min-w-0 bg-muted/95 backdrop-blur-sm">
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
                                <TableCell className="min-w-0 wrap-break-word align-middle">
                                  <Checkbox
                                    checked={selected[key] === true}
                                    onCheckedChange={(checked) =>
                                      setSelected((prev) => ({ ...prev, [key]: checked === true }))
                                    }
                                    aria-label={t("aiEnrich.tableSelect")}
                                  />
                                </TableCell>
                                <TableCell className="min-w-0 wrap-break-word font-medium">
                                  {enrichmentFieldTitle(t, key)}
                                </TableCell>
                                <TableCell className="min-w-0 wrap-break-word text-muted-foreground text-sm">
                                  {readCurrent(company, key)}
                                </TableCell>
                                <TableCell className="min-w-0 wrap-break-word text-sm">{formatSuggested(s)}</TableCell>
                                <TableCell className="min-w-0 wrap-break-word align-middle">
                                  <Badge variant={confidenceBadgeVariant(s.confidence)}>
                                    {s.confidence === "high"
                                      ? t("aiEnrich.confidenceHigh")
                                      : s.confidence === "medium"
                                        ? t("aiEnrich.confidenceMedium")
                                        : t("aiEnrich.confidenceLow")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="min-w-0 wrap-break-word text-xs">
                                  <ul className="space-y-1.5">
                                    {s.sources.map((src) => (
                                      <li key={src.url} className="min-w-0">
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
        </div>

        <DialogFooter className="mx-0 mt-0 mb-0 flex w-full shrink-0 flex-col gap-3 rounded-none border-border border-t bg-muted/40 px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-4 sm:gap-y-2 sm:px-8 sm:py-4">
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
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
