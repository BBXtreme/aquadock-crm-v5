"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  type AiEnrichmentSettingsSnapshot,
  getAiEnrichmentSettingsSnapshot,
  updateAiEnrichmentSettings,
} from "@/lib/actions/settings";
import { getVercelAiCredits } from "@/lib/actions/vercel-ai-credits";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";

const VERCEL_AI_GATEWAY_USAGE_HREF = "https://vercel.com/docs/ai-gateway/capabilities/usage";

function formatUsdCredits(amount: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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
  const [modelPreference, setModelPreference] = useState(initialSnapshot.modelPreference);
  const [addressFocusPrioritize, setAddressFocusPrioritize] = useState(
    initialSnapshot.addressFocusPrioritize,
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

  const creditsQuery = useQuery({
    queryKey: ["vercel-ai-gateway-credits"],
    queryFn: getVercelAiCredits,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  const usedToday = snapshot?.usedToday ?? 0;
  const limit = snapshot?.dailyLimit ?? 1;
  const usagePercent = limit > 0 ? Math.min(100, Math.round((usedToday / limit) * 100)) : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const n = Number.parseInt(dailyLimit.trim(), 10);
      const res = await updateAiEnrichmentSettings({
        enabled,
        dailyLimit: n,
        modelPreference,
        addressFocusPrioritize,
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
        setModelPreference(refreshed.data.modelPreference);
        setAddressFocusPrioritize(refreshed.data.addressFocusPrioritize);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["ai-enrichment-settings-snapshot"] });
      }
      toast.success(t("aiEnrichment.toastSaved"));
    },
    onError: () => {
      toast.error(t("aiEnrichment.toastSaveFailed"));
    },
  });

  return (
    <section className="space-y-4" aria-labelledby="settings-ai-automation-heading">
      <h2
        id="settings-ai-automation-heading"
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        {t("aiEnrichment.sectionTitle")}
      </h2>
      <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            {t("aiEnrichment.cardTitle")}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">{t("aiEnrichment.cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6" aria-busy={isFetching || saveMutation.isPending}>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 sm:px-5">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("aiEnrichment.usageHeading")}
            </p>
            <p className="mt-1 text-sm tabular-nums text-foreground">
              {t("aiEnrichment.usageLine", { used: usedToday, limit })}
            </p>
            <Progress value={usagePercent} className="mt-2 h-2" aria-label={t("aiEnrichment.usageHeading")} />
            <p className="text-muted-foreground mt-2 text-xs leading-snug">{t("aiEnrichment.usageHint")}</p>
            {creditsQuery.isPending ? (
              <Skeleton className="mt-2 h-4 w-56" aria-hidden />
            ) : creditsQuery.data?.ok === true ? (
              <p className="text-muted-foreground mt-2 text-sm tabular-nums leading-snug">
                {t("aiEnrichment.vercelAiCreditsLine", {
                  balance: formatUsdCredits(creditsQuery.data.balance, numberLocaleTag),
                  totalUsed: formatUsdCredits(creditsQuery.data.totalUsed, numberLocaleTag),
                })}{" "}
                <a
                  href={VERCEL_AI_GATEWAY_USAGE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("aiEnrichment.vercelAiGatewayDashboardLink")}
                </a>
              </p>
            ) : creditsQuery.data?.ok === false && creditsQuery.data.error === "NOT_CONFIGURED" ? (
              <p className="text-muted-foreground mt-2 text-xs leading-snug">{t("aiEnrichment.vercelAiCreditsNotConfigured")}</p>
            ) : creditsQuery.data?.ok === false ? (
              <p className="text-muted-foreground mt-2 text-xs leading-snug">{t("aiEnrichment.vercelAiCreditsUnavailable")}</p>
            ) : null}
            {modelPreference === "grok" ? (
              <p className="text-muted-foreground mt-2 text-xs leading-snug">
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

          <div className="space-y-2">
            <Label htmlFor="ai-enrich-model" className="text-sm font-medium">
              {t("aiEnrichment.modelLabel")}
            </Label>
            <p className="text-muted-foreground text-xs leading-relaxed">{t("aiEnrichment.modelHelp")}</p>
            <Select
              value={modelPreference}
              onValueChange={(v) => {
                if (v === "auto" || v === "claude" || v === "grok") {
                  setModelPreference(v);
                }
              }}
              disabled={saveMutation.isPending}
            >
              <SelectTrigger id="ai-enrich-model" className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t("aiEnrichment.modelAuto")}</SelectItem>
                <SelectItem value="claude">{t("aiEnrichment.modelClaude")}</SelectItem>
                <SelectItem value="grok">{t("aiEnrichment.modelGrok")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
    </section>
  );
}
