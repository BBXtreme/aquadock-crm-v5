// AI enrichment modal — review-only suggestions (model-only default; optional full web search).

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { researchCompanyEnrichment } from "@/lib/actions/company-enrichment";
import { getAiEnrichmentSettingsSnapshot } from "@/lib/actions/settings";
import { formatAiEnrichmentSummaryForDisplay } from "@/lib/ai/ai-enrichment-display";
import type { CompanyEnrichmentWebSearchMode } from "@/lib/ai/company-enrichment-gateway";
import type { EnrichmentGatewayFailureDiagnostic } from "@/lib/ai/enrichment-gateway-failure-types";
import {
  getCompanyResearchBadge,
  getEnrichmentGatewayModelMeta,
  listEnrichmentGatewayModelsOrdered,
} from "@/lib/constants/ai-models";
import { VERCEL_AI_GATEWAY_DASHBOARD_HREF } from "@/lib/constants/vercel-ai-gateway";
import { useT } from "@/lib/i18n/use-translations";
import { ENRICHMENT_GATEWAY_MODEL_ID_CHOICES } from "@/lib/services/ai-enrichment-policy";
import { cn } from "@/lib/utils";
import type { CompanyForm } from "@/lib/validations/company";
import {
  type CompanyEnrichmentResult,
  ENRICHMENT_FIELD_KEYS,
  type EnrichmentFieldKey,
  type SanitizedFieldSuggestion,
} from "@/lib/validations/company-enrichment";
import type { Company } from "@/types/database.types";

const AI_ENRICHMENT_RATE_PREFIX = "AI_ENRICHMENT_RATE_LIMIT:";
const MODEL_OVERRIDE_DEFAULT = "__model_default__" as const;

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

function ModalOverrideModelSelectItemContent({
  modelId,
  xaiBillingContext,
}: {
  modelId: EnrichmentGatewayModelId;
  xaiBillingContext: boolean;
}) {
  const meta = getEnrichmentGatewayModelMeta(modelId);
  const badge = getCompanyResearchBadge(modelId, { xaiBillingContext });
  return (
    <span className="flex max-w-[min(100vw-4rem,28rem)] flex-wrap items-center gap-2">
      <span className="min-w-0 truncate font-medium">{meta?.label ?? modelId}</span>
      {badge ? (
        <Badge variant={badge.variant} className={badge.className}>
          {badge.text}
        </Badge>
      ) : null}
    </span>
  );
}

type AiEnrichmentUsageSnapshot = { usedToday: number; dailyLimit: number };

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

type EnrichmentMutationPayload = {
  runGeneration: number;
  data: CompanyEnrichmentResult;
  modelUsed: string;
};

type Props = {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPatch: (patch: Partial<CompanyForm>) => void;
};

export function AIEnrichmentModal({ company, open, onOpenChange, onApplyPatch }: Props) {
  const t = useT("companies");
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<Partial<Record<EnrichmentFieldKey, boolean>>>({});
  const [result, setResult] = useState<CompanyEnrichmentResult | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [enrichmentInlineError, setEnrichmentInlineError] = useState<string | null>(null);
  const [enrichmentFailureDetail, setEnrichmentFailureDetail] = useState<EnrichmentGatewayFailureDiagnostic | null>(
    null,
  );
  const [modelOverridePick, setModelOverridePick] = useState<EnrichmentGatewayModelId | typeof MODEL_OVERRIDE_DEFAULT>(
    MODEL_OVERRIDE_DEFAULT,
  );
  const [enrichmentWebMode, setEnrichmentWebMode] = useState<CompanyEnrichmentWebSearchMode>("model-only");
  const modelOverrideRef = useRef<EnrichmentGatewayModelId | null>(null);
  const enrichmentWebModeRef = useRef<CompanyEnrichmentWebSearchMode>("model-only");
  const activeRunGenerationRef = useRef(0);
  const runForOpenSessionRef = useRef(false);
  const startTimeoutRef = useRef<number | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    modelOverrideRef.current = modelOverridePick === MODEL_OVERRIDE_DEFAULT ? null : modelOverridePick;
  }, [modelOverridePick]);

  useEffect(() => {
    enrichmentWebModeRef.current = enrichmentWebMode;
  }, [enrichmentWebMode]);

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

  const snapshotPrimary: EnrichmentGatewayModelId | null =
    usageQuery.data && isEnrichmentGatewayModelId(usageQuery.data.primaryGatewayModelId)
      ? usageQuery.data.primaryGatewayModelId
      : null;

  const { mutate, reset, isPending, isSuccess, isError } = useMutation({
    mutationFn: async (runGeneration: number): Promise<EnrichmentMutationPayload> => {
      const primary = modelOverrideRef.current;
      const mode = enrichmentWebModeRef.current;
      const res = await researchCompanyEnrichment(company.id, {
        webSearchMode: mode,
        gatewayModelOverride: mode === "model-only" && primary !== null ? { primary } : undefined,
      });
      if (!res.ok) {
        throw new ResearchCompanyEnrichmentClientError(res.error, res.diagnostic);
      }
      return { runGeneration, data: res.data, modelUsed: res.modelUsed };
    },
    onSuccess: (payload) => {
      if (payload.runGeneration !== activeRunGenerationRef.current) {
        return;
      }
      setEnrichmentInlineError(null);
      setEnrichmentFailureDetail(null);
      setResult(payload.data);
      setModelUsed(payload.modelUsed);
      const next: Partial<Record<EnrichmentFieldKey, boolean>> = {};
      for (const key of ENRICHMENT_FIELD_KEYS) {
        if (payload.data.suggestions[key]) {
          next[key] = false;
        }
      }
      setSelected(next);
      void queryClient.invalidateQueries({ queryKey: ["ai-enrichment-settings-snapshot"] });
    },
    onError: (err, runGeneration) => {
      if (runGeneration !== activeRunGenerationRef.current) {
        return;
      }
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

  const startEnrichmentRun = useCallback(() => {
    activeRunGenerationRef.current += 1;
    const gen = activeRunGenerationRef.current;
    setProgress(0);
    setResult(null);
    setModelUsed(null);
    setSelected({});
    setEnrichmentInlineError(null);
    setEnrichmentFailureDetail(null);
    reset();
    mutate(gen);
  }, [mutate, reset]);

  const startEnrichmentRunRef = useRef(startEnrichmentRun);
  startEnrichmentRunRef.current = startEnrichmentRun;

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open) {
      activeRunGenerationRef.current = 0;
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
        setModelOverridePick(MODEL_OVERRIDE_DEFAULT);
        setEnrichmentWebMode("model-only");
        enrichmentWebModeRef.current = "model-only";
      }
      reset();
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
      startEnrichmentRunRef.current();
    }, 0);
    return () => {
      cancelled = true;
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };
  }, [open, reset]);

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

  const modelCostHint = useMemo(() => {
    if (!result || isPending || !modelUsed) {
      return null;
    }
    const lower = modelUsed.toLowerCase();
    if (
      /grok-4\.1-fast|grok-4-fast|gemini-3-flash|gemini-2\.5-flash|claude-haiku|gpt-5\.4-mini|gpt-5-mini|nano/.test(
        lower,
      )
    ) {
      return t("aiEnrich.costHintLower");
    }
    if (/claude-sonnet|claude-opus/.test(lower) || lower === "openai/gpt-5.4") {
      return t("aiEnrich.costHintHigher");
    }
    return null;
  }, [result, isPending, modelUsed, t]);

  const handleRetry = () => {
    startEnrichmentRun();
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

  /** Select shows saved primary or last-run model when no explicit override is chosen. */
  const effectiveSelectModelValue = useMemo((): EnrichmentGatewayModelId | typeof MODEL_OVERRIDE_DEFAULT => {
    if (modelOverridePick !== MODEL_OVERRIDE_DEFAULT) {
      return modelOverridePick;
    }
    if (usageQuery.data === undefined || usageQuery.data === null) {
      return MODEL_OVERRIDE_DEFAULT;
    }
    if (modelUsed && isEnrichmentGatewayModelId(modelUsed)) {
      return modelUsed;
    }
    if (snapshotPrimary !== null) {
      return snapshotPrimary;
    }
    return MODEL_OVERRIDE_DEFAULT;
  }, [modelOverridePick, usageQuery.data, modelUsed, snapshotPrimary]);

  const xaiBillingForSelectItems =
    typeof usageQuery.data?.primaryGatewayModelId === "string" &&
    usageQuery.data.primaryGatewayModelId.startsWith("xai/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,1000px)] max-h-[95dvh] min-h-0 w-[calc(100vw-1rem)] max-w-[min(1400px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[min(1400px,calc(100vw-2rem))] sm:rounded-xl">
        <div className="max-h-[min(140px,24dvh)] min-h-0 shrink-0 overflow-y-auto border-border border-b px-5 pt-9 pb-2 sm:max-h-[min(128px,20dvh)] sm:px-7 sm:pt-10">
          <div className="flex min-w-0 items-start justify-between gap-2 pr-12 sm:pr-14">
            <DialogHeader className="min-w-0 flex-1 space-y-0 text-left">
              <DialogTitle className="wrap-break-word text-balance text-xs font-semibold leading-tight tracking-tight sm:text-sm">
                {t("aiEnrich.modalTitle")}
              </DialogTitle>
              <DialogDescription className="sr-only">{t("aiEnrich.modalDescription")}</DialogDescription>
            </DialogHeader>
            {usageQuery.data ? (
              <Badge
                variant="outline"
                className="shrink-0 border-border/60 bg-muted/25 px-2 py-0 text-[10px] text-muted-foreground/90 tabular-nums leading-none"
                aria-label={t("aiEnrich.usageHeading")}
              >
                {t("aiEnrich.usagePill", {
                  used: usageQuery.data.usedToday,
                  limit: usageQuery.data.dailyLimit,
                })}
              </Badge>
            ) : open && usageQuery.isLoading ? (
              <Skeleton className="h-5 w-14 shrink-0 rounded-full" aria-hidden />
            ) : null}
          </div>

          <div className="mt-1.5 flex min-w-0 flex-col gap-1.5 sm:mt-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Switch
                id="ai-enrich-web-search"
                checked={enrichmentWebMode === "full"}
                onCheckedChange={(checked) => {
                  const next: CompanyEnrichmentWebSearchMode = checked ? "full" : "model-only";
                  if (enrichmentWebMode === next) {
                    return;
                  }
                  enrichmentWebModeRef.current = next;
                  setEnrichmentWebMode(next);
                  if (checked) {
                    modelOverrideRef.current = null;
                    setModelOverridePick(MODEL_OVERRIDE_DEFAULT);
                  }
                  startEnrichmentRun();
                }}
                aria-label={t("aiEnrich.webSearchCurrentLabel")}
              />
              <Label
                htmlFor="ai-enrich-web-search"
                className="cursor-pointer text-foreground text-[11px] font-medium leading-none sm:text-xs"
              >
                {t("aiEnrich.webSearchCurrentLabel")}
              </Label>
            </div>
            {enrichmentWebMode === "model-only" ? (
              <div className="min-w-0 flex-1 sm:max-w-md">
                <Select
                  value={effectiveSelectModelValue}
                  onValueChange={(v) => {
                    if (v !== MODEL_OVERRIDE_DEFAULT && !isEnrichmentGatewayModelId(v)) {
                      return;
                    }
                    if (v === MODEL_OVERRIDE_DEFAULT && modelOverridePick === MODEL_OVERRIDE_DEFAULT) {
                      return;
                    }
                    if (
                      modelOverridePick === MODEL_OVERRIDE_DEFAULT &&
                      v !== MODEL_OVERRIDE_DEFAULT &&
                      isEnrichmentGatewayModelId(v) &&
                      v === effectiveSelectModelValue
                    ) {
                      return;
                    }
                    if (v === modelOverridePick && modelOverridePick !== MODEL_OVERRIDE_DEFAULT) {
                      return;
                    }
                    const nextRef: EnrichmentGatewayModelId | null =
                      v === MODEL_OVERRIDE_DEFAULT ? null : (v as EnrichmentGatewayModelId);
                    modelOverrideRef.current = nextRef;
                    if (v === MODEL_OVERRIDE_DEFAULT) {
                      setModelOverridePick(MODEL_OVERRIDE_DEFAULT);
                    } else {
                      setModelOverridePick(v);
                    }
                    startEnrichmentRun();
                  }}
                >
                  <SelectTrigger
                    id="ai-enrich-model-override"
                    className="h-7 w-full text-xs"
                    aria-label={t("aiEnrich.modelOverrideLabel")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={MODEL_OVERRIDE_DEFAULT}>{t("aiEnrich.sessionModelDefault")}</SelectItem>
                    {listEnrichmentGatewayModelsOrdered().map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <ModalOverrideModelSelectItemContent modelId={m.id} xaiBillingContext={xaiBillingForSelectItems} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-1 text-[9px] leading-snug sm:text-[10px]",
              enrichmentWebMode === "model-only"
                ? "text-amber-800/95 dark:text-amber-400/95"
                : "text-muted-foreground",
            )}
          >
            {enrichmentWebMode === "full" ? t("aiEnrich.webSearchActive") : t("aiEnrich.modelOnlyStatusLine")}
          </p>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 py-2 sm:px-7 sm:py-2.5">
            {isError || enrichmentInlineError ? (
              <div className="mb-2 shrink-0 space-y-2">
                <div
                  role="alert"
                  className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm leading-snug"
                >
                  {enrichmentInlineError ? (
                    <p className="font-medium text-destructive">{enrichmentInlineError}</p>
                  ) : (
                    <p className="font-medium text-destructive">{t("aiEnrich.errorGeneric")}</p>
                  )}
                  {enrichmentFailureDetail ? (
                    <div className="space-y-1.5 border-destructive/20 border-t border-dashed pt-2 text-muted-foreground">
                      <p className="font-mono text-[11px] leading-snug wrap-break-word">
                        <span className="text-foreground/80">{t("aiEnrich.diagnosticCodeLabel")}:</span>{" "}
                        {enrichmentFailureDetail.stableCode}
                        {enrichmentFailureDetail.httpStatus !== undefined ? (
                          <span>
                            {" "}
                            · {t("aiEnrich.diagnosticHttp", { status: String(enrichmentFailureDetail.httpStatus) })}
                          </span>
                        ) : null}
                        {enrichmentFailureDetail.generationId ? (
                          <span>
                            {" "}
                            · {t("aiEnrich.diagnosticGen", { id: enrichmentFailureDetail.generationId })}
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
                          {t("aiEnrich.errorVercelCreditsActionHint")}{" "}
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
                          {t("aiEnrich.diagnosticTokenUsage", { hint: enrichmentFailureDetail.tokenUsageHint })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                    {t("aiEnrich.retry")}
                  </Button>
                </div>
              </div>
            ) : null}

            {showSkeleton ? (
              <div className="shrink-0 space-y-3">
                <Progress value={progress} className="h-2" />
                <p className="text-muted-foreground text-sm">{t("aiEnrich.loadingSteps")}</p>
                <div className="space-y-2">
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
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:gap-3">
                {result.aiSummary ? (
                  <section className="shrink-0 rounded-lg border bg-muted/30 px-3 py-2 text-sm shadow-xs sm:px-4 sm:py-2.5">
                    <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                      {t("aiEnrich.summaryLabel")}
                    </h3>
                    <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-foreground text-xs leading-relaxed">
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
                  <div className="shrink-0 space-y-0.5">
                    <p className="text-muted-foreground text-[11px]">
                      {t("aiEnrich.modelUsed", {
                        model: isEnrichmentGatewayModelId(modelUsed)
                          ? getEnrichmentGatewayModelMeta(modelUsed)?.label ?? modelUsed
                          : modelUsed,
                      })}
                    </p>
                    <p className="text-muted-foreground text-[10px] leading-snug">
                      {enrichmentWebMode === "full"
                        ? t("aiEnrich.modelUsedResearchFootnoteFull")
                        : t("aiEnrich.modelUsedResearchFootnoteModelOnly")}
                    </p>
                    {modelCostHint ? (
                      <p className="text-muted-foreground text-[10px] leading-snug">{modelCostHint}</p>
                    ) : null}
                  </div>
                ) : null}
                {rows.length === 0 ? (
                  <p className="text-muted-foreground shrink-0 text-sm">{t("aiEnrich.noSuggestions")}</p>
                ) : (
                  <section
                    aria-label={t("aiEnrich.tableField")}
                    className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5"
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

        <DialogFooter className="mx-0 mt-0 mb-0 flex w-full shrink-0 flex-col gap-2 rounded-none border-border border-t bg-muted/40 px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-3 sm:gap-y-2 sm:px-7 sm:py-3">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
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
