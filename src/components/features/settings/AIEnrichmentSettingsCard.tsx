"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  type AiEnrichmentSettingsSnapshot,
  getAiEnrichmentSettingsSnapshot,
  updateAiEnrichmentSettings,
} from "@/lib/actions/settings";
import { getVercelAiCredits } from "@/lib/actions/vercel-ai-credits";
import {
  getCompanyResearchBadge,
  getEnrichmentGatewayModelMeta,
  listEnrichmentGatewayModelsOrdered,
} from "@/lib/constants/ai-models";
import { VERCEL_AI_GATEWAY_DASHBOARD_HREF } from "@/lib/constants/vercel-ai-gateway";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { ENRICHMENT_GATEWAY_MODEL_ID_CHOICES } from "@/lib/services/ai-enrichment-policy";

type EnrichmentGatewayModelId = (typeof ENRICHMENT_GATEWAY_MODEL_ID_CHOICES)[number];

const GROK_41_FAST_NON_REASONING: EnrichmentGatewayModelId = "xai/grok-4.1-fast-non-reasoning";

function isEnrichmentGatewayModelId(value: string): value is EnrichmentGatewayModelId {
  return (ENRICHMENT_GATEWAY_MODEL_ID_CHOICES as readonly string[]).includes(value);
}

function toEnrichmentGatewayModelChoice(value: string): EnrichmentGatewayModelId {
  if (isEnrichmentGatewayModelId(value)) {
    return value;
  }
  return ENRICHMENT_GATEWAY_MODEL_ID_CHOICES[0];
}

function EnrichmentModelSelectItemContent({
  modelId,
  xaiBillingContext,
  recommendedBadgeText,
}: {
  modelId: EnrichmentGatewayModelId;
  xaiBillingContext: boolean;
  recommendedBadgeText: string | null;
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
      {recommendedBadgeText !== null && recommendedBadgeText.length > 0 ? (
        <Badge variant="secondary" className="shrink-0 font-normal">
          {recommendedBadgeText}
        </Badge>
      ) : null}
    </span>
  );
}

function formatUsdCredits(amount: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function shouldShowVercelAiCreditsInSettings(primaryGatewayModelId: string): boolean {
  return !primaryGatewayModelId.startsWith("xai/");
}

function shouldShowGrokBillingNotice(primaryGatewayModelId: string): boolean {
  return primaryGatewayModelId.startsWith("xai/");
}

type Props = {
  initialSnapshot: AiEnrichmentSettingsSnapshot;
};

export function AIEnrichmentSettingsCard({ initialSnapshot }: Props) {
  const t = useT("settings");
  const numberLocaleTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(initialSnapshot.enabled);
  const [dailyLimit, setDailyLimit] = useState(String(initialSnapshot.dailyLimit));
  const [addressFocusPrioritize, setAddressFocusPrioritize] = useState(
    initialSnapshot.addressFocusPrioritize,
  );
  const [primaryGatewayModelId, setPrimaryGatewayModelId] = useState<EnrichmentGatewayModelId>(() =>
    toEnrichmentGatewayModelChoice(initialSnapshot.primaryGatewayModelId),
  );
  const [perplexityFastMaxResults, setPerplexityFastMaxResults] = useState(
    () => initialSnapshot.perplexityFastMaxResults,
  );
  const [perplexityFastRecency, setPerplexityFastRecency] = useState<"month" | "year">(
    () => initialSnapshot.perplexityFastRecency,
  );

  const { data: snapshot, isFetching } = useQuery({
    queryKey: ["ai-enrichment-settings-snapshot"],
    queryFn: async () => {
      const res = await getAiEnrichmentSettingsSnapshot();
      if (!res.ok) {
        throw new Error("NOT_AUTHENTICATED");
      }
      return res.data;
    },
    initialData: initialSnapshot,
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const showVercelAiCredits = shouldShowVercelAiCreditsInSettings(primaryGatewayModelId);

  const creditsQuery = useQuery({
    queryKey: ["vercel-ai-gateway-credits"],
    queryFn: getVercelAiCredits,
    enabled: showVercelAiCredits,
    staleTime: 60_000,
    refetchInterval: showVercelAiCredits ? 120_000 : false,
    refetchOnWindowFocus: showVercelAiCredits,
  });

  const usedToday = snapshot?.usedToday ?? 0;
  const limit = snapshot?.dailyLimit ?? 1;

  const xaiBillingContextForBadges = primaryGatewayModelId.startsWith("xai/");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const n = Number.parseInt(dailyLimit.trim(), 10);
      const res = await updateAiEnrichmentSettings({
        enabled,
        dailyLimit: n,
        primaryGatewayModelId,
        addressFocusPrioritize,
        perplexityFastMaxResults,
        perplexityFastRecency,
      });
      return res;
    },
    onSuccess: async (res) => {
      if (!res.ok) {
        if (res.error === "INVALID_INPUT") {
          toast.error(t("aiEnrichment.toastInvalid"));
        } else if (res.error === "SAVE_FAILED") {
          toast.error(t("aiEnrichment.toastSaveFailed"));
        } else {
          toast.error(t("common.unknownError"));
        }
        return;
      }
      const refreshed = await getAiEnrichmentSettingsSnapshot();
      if (refreshed.ok) {
        queryClient.setQueryData(["ai-enrichment-settings-snapshot"], refreshed.data);
        setEnabled(refreshed.data.enabled);
        setDailyLimit(String(refreshed.data.dailyLimit));
        setAddressFocusPrioritize(refreshed.data.addressFocusPrioritize);
        setPrimaryGatewayModelId(toEnrichmentGatewayModelChoice(refreshed.data.primaryGatewayModelId));
        setPerplexityFastMaxResults(refreshed.data.perplexityFastMaxResults);
        setPerplexityFastRecency(refreshed.data.perplexityFastRecency);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["ai-enrichment-settings-snapshot"] });
      }
      toast.success(t("aiEnrichment.toastSaved"));
    },
    onError: () => {
      toast.error(t("aiEnrichment.toastSaveFailed"));
    },
  });

  const sectionClass =
    "space-y-3 rounded-lg border border-border/40 bg-muted/15 px-4 py-4 sm:px-5 sm:py-4";

  return (
    <Card className="shadow-sm md:col-span-2">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          {t("aiEnrichment.cardTitle")}
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm leading-snug">
          {t("aiEnrichment.cardDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6" aria-busy={isFetching || saveMutation.isPending}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="ai-enrich-enabled" className="text-sm font-medium">
              {t("aiEnrichment.toggleEnabled")}
            </Label>
            <p className="text-muted-foreground text-xs leading-relaxed">{t("aiEnrichment.toggleEnabledHelp")}</p>
          </div>
          <Switch
            id="ai-enrich-enabled"
            className="shrink-0"
            checked={enabled}
            disabled={saveMutation.isPending}
            onCheckedChange={setEnabled}
            aria-label={t("aiEnrichment.toggleEnabled")}
          />
        </div>

        <section className={sectionClass} aria-labelledby="ai-enrich-limit-usage-heading">
          <h3 id="ai-enrich-limit-usage-heading" className="text-foreground text-sm font-semibold">
            {t("aiEnrichment.limitUsageSectionTitle")}
          </h3>
          <div className="space-y-2">
            <Label htmlFor="ai-enrich-daily-limit" className="text-sm font-medium">
              {t("aiEnrichment.dailyLimitLabel")}
            </Label>
            <p className="text-muted-foreground text-xs leading-relaxed">{t("aiEnrichment.dailyLimitHelp")}</p>
            <Input
              id="ai-enrich-daily-limit"
              type="number"
              min={1}
              max={500}
              className="max-w-xs"
              inputMode="numeric"
              value={dailyLimit}
              disabled={saveMutation.isPending}
              onChange={(e) => setDailyLimit(e.target.value)}
            />
          </div>
          <div className="border-border/40 space-y-2 border-t pt-3">
            <p className="text-muted-foreground text-sm tabular-nums">
              {t("aiEnrichment.usageLine", { used: usedToday, limit })}
            </p>
            {showVercelAiCredits ? (
              creditsQuery.isPending ? (
                <Skeleton className="h-4 w-56" aria-hidden />
              ) : creditsQuery.data?.ok === true ? (
                <p className="text-muted-foreground text-xs leading-snug tabular-nums">
                  {t("aiEnrichment.vercelAiCreditsLine", {
                    balance: formatUsdCredits(creditsQuery.data.balance, numberLocaleTag),
                    totalUsed: formatUsdCredits(creditsQuery.data.totalUsed, numberLocaleTag),
                  })}{" "}
                  <a
                    href={VERCEL_AI_GATEWAY_DASHBOARD_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t("aiEnrichment.vercelAiGatewayDashboardLink")}
                  </a>
                </p>
              ) : creditsQuery.data?.ok === false && creditsQuery.data.error === "NOT_CONFIGURED" ? (
                <p className="text-muted-foreground text-xs leading-snug">{t("aiEnrichment.vercelAiCreditsNotConfigured")}</p>
              ) : creditsQuery.data?.ok === false ? (
                <p className="text-muted-foreground text-xs leading-snug">{t("aiEnrichment.vercelAiCreditsUnavailable")}</p>
              ) : null
            ) : null}
            {shouldShowGrokBillingNotice(primaryGatewayModelId) ? (
              <p className="text-muted-foreground text-xs leading-snug">
                {t("aiEnrichment.grokBillingNotice")}{" "}
                <a
                  href="https://console.x.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("aiEnrichment.grokConsoleLinkLabel")}
                </a>
                .
              </p>
            ) : null}
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="ai-enrich-structuring-heading">
          <h3 id="ai-enrich-structuring-heading" className="text-foreground text-sm font-semibold">
            {t("aiEnrichment.structuringModelSectionTitle")}
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">{t("aiEnrichment.structuringModelHelp")}</p>
          <Select
            value={primaryGatewayModelId}
            onValueChange={(v) => {
              if (isEnrichmentGatewayModelId(v)) {
                setPrimaryGatewayModelId(v);
              }
            }}
            disabled={saveMutation.isPending}
          >
            <SelectTrigger id="ai-enrich-gateway-model" className="w-full max-w-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {listEnrichmentGatewayModelsOrdered().map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <EnrichmentModelSelectItemContent
                    modelId={m.id}
                    xaiBillingContext={xaiBillingContextForBadges}
                    recommendedBadgeText={
                      m.id === GROK_41_FAST_NON_REASONING ? t("aiEnrichment.recommendedXaiSubscription") : null
                    }
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className={sectionClass} aria-labelledby="ai-enrich-web-config-heading">
          <h3 id="ai-enrich-web-config-heading" className="text-foreground text-sm font-semibold">
            {t("aiEnrichment.webSearchConfigSectionTitle")}
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">{t("aiEnrichment.webSearchConfigHelp")}</p>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="ai-enrich-perplexity-max" className="text-sm font-medium">
                {t("aiEnrichment.perplexityWebMaxResultsLabel")}
              </Label>
              <Select
                value={String(perplexityFastMaxResults)}
                onValueChange={(v) => {
                  const parsed = Number.parseInt(v, 10);
                  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 8) {
                    setPerplexityFastMaxResults(parsed);
                  }
                }}
                disabled={saveMutation.isPending}
              >
                <SelectTrigger id="ai-enrich-perplexity-max" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {String(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-enrich-perplexity-recency" className="text-sm font-medium">
                {t("aiEnrichment.perplexityWebRecencyLabel")}
              </Label>
              <Select
                value={perplexityFastRecency}
                onValueChange={(v) => {
                  if (v === "month" || v === "year") {
                    setPerplexityFastRecency(v);
                  }
                }}
                disabled={saveMutation.isPending}
              >
                <SelectTrigger id="ai-enrich-perplexity-recency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t("aiEnrichment.perplexityFastRecencyMonth")}</SelectItem>
                  <SelectItem value="year">{t("aiEnrichment.perplexityFastRecencyYear")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-border/40 mt-4 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor="ai-enrich-address-focus" className="text-sm font-medium">
                {t("aiEnrichment.addressFocusLabel")}
              </Label>
              <p className="text-muted-foreground text-xs leading-relaxed">{t("aiEnrichment.addressFocusHelp")}</p>
            </div>
            <Switch
              id="ai-enrich-address-focus"
              className="shrink-0"
              checked={addressFocusPrioritize}
              disabled={saveMutation.isPending}
              onCheckedChange={setAddressFocusPrioritize}
              aria-label={t("aiEnrichment.addressFocusLabel")}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {t("common.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
