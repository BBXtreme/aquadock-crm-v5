"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CircleHelp, Copy, Link2, LockKeyhole, MapPinned } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getStandortLandOptions } from "@/lib/standortanalyse/countries";
import { standortKriterien } from "@/lib/standortanalyse/criteria";
import { calculateStandortScore } from "@/lib/standortanalyse/scoring";
import { cn } from "@/lib/utils";
import { type StandortanalyseForm, standortanalyseFormSchema } from "@/lib/validations/standortanalyse";

type WizardMode = "internal" | "public";
type KriterienKey = keyof StandortanalyseForm["kriterien"] & string;
type KriterienPath = `kriterien.${KriterienKey}`;

const CRITERIA_COLORS: Record<string, string> = {
  Gut: "#16a34a",
  Mittel: "#f59e0b",
  Kritisch: "#dc2626",
};

const scoreBadgeTone: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  yellow: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const stepTriggerFields = {
  1: [
    "kontakt.name",
    "kontakt.vorname",
    "kontakt.email",
    "standort.plz",
    "standort.ort",
    "standort.land",
  ] as const,
  2: standortKriterien.map((criterion) => `kriterien.${criterion.id}` as KriterienPath),
};

type ShareApiResponse = {
  analysisId: string;
  shareUrl: string;
  expiresAt: string;
  maxUses: number;
};

type AnalyseListItem = {
  id: string;
  status: "draft" | "submitted" | "completed";
  created_at: string;
  updated_at: string;
  total_points: number;
  recommendation: string;
  standort_ort: string;
  kontakt_name: string;
  submitted_at: string | null;
};

const DEFAULT_FORM_VALUES: StandortanalyseForm = {
  kontakt: {
    name: "",
    vorname: "",
    email: "",
    strasse: "",
    plz: "",
    ort: "",
    telefon: "",
    firma: "",
  },
  standort: {
    plz: "",
    ort: "",
    strasse: "",
    land: "DE",
    datum: new Date().toISOString().slice(0, 10),
    erstelltVon: "",
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
  notizen: "",
};

export function StandortanalyseWizard({ mode = "internal", shareToken }: { mode?: WizardMode; shareToken?: string }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submittedData, setSubmittedData] = useState<StandortanalyseForm | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [loadingAnalysisId, setLoadingAnalysisId] = useState<string | null>(null);
  const [shareGenerationPassword, setShareGenerationPassword] = useState("");
  const [shareExpiresHours, setShareExpiresHours] = useState(24);
  const [shareLink, setShareLink] = useState<ShareApiResponse | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isCopyingShareLink, setIsCopyingShareLink] = useState(false);
  const [isSubmittingAnalysis, setIsSubmittingAnalysis] = useState(false);
  const [publicSubmitPassword, setPublicSubmitPassword] = useState("");
  const [publicLinkValid, setPublicLinkValid] = useState<boolean | null>(mode === "public" ? null : true);
  const [publicRequiresPassword, setPublicRequiresPassword] = useState(false);
  const [publicLinkMessage, setPublicLinkMessage] = useState<string | null>(null);
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
  const [mapInfo, setMapInfo] = useState<string>("");
  const [mapError, setMapError] = useState<string | null>(null);

  const form = useForm<StandortanalyseForm>({
    resolver: zodResolver(standortanalyseFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onTouched",
  });

  const currentValues = form.watch();
  const currentScore = useMemo(() => calculateStandortScore(currentValues.kriterien), [currentValues.kriterien]);

  const analysesQuery = useQuery({
    queryKey: ["standortanalysen", mode],
    queryFn: async () => {
      if (mode !== "internal") {
        return [] as AnalyseListItem[];
      }
      const response = await fetch("/api/standortanalyse");
      const payload = (await response.json()) as { analyses?: AnalyseListItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Analysen konnten nicht geladen werden");
      }
      return payload.analyses ?? [];
    },
    enabled: mode === "internal",
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/standortanalyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysisId ?? undefined,
          submit: false,
          createOrUpdateContact: false,
          formData: form.getValues(),
        }),
      });
      const payload = (await response.json()) as { analysisId?: string; error?: string };
      if (!response.ok || typeof payload.analysisId !== "string") {
        throw new Error(payload.error ?? "Entwurf konnte nicht gespeichert werden");
      }
      return payload.analysisId;
    },
    onSuccess: (savedAnalysisId) => {
      setAnalysisId(savedAnalysisId);
      void queryClient.invalidateQueries({ queryKey: ["standortanalysen", mode] });
      toast.success("Entwurf gespeichert");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Entwurf konnte nicht gespeichert werden");
    },
  });

  useEffect(() => {
    if (mode !== "public" || shareToken == null) {
      return;
    }

    const controller = new AbortController();
    async function validatePublicLink() {
      const response = await fetch(`/api/standortanalyse/share/${shareToken}`, { signal: controller.signal });
      const payload = (await response.json()) as {
        valid?: boolean;
        requiresPassword?: boolean;
        error?: string;
      };
      if (!response.ok || payload.valid !== true) {
        setPublicLinkValid(false);
        setPublicLinkMessage(payload.error ?? "Dieser Link ist ungültig oder nicht mehr verfügbar.");
        return;
      }
      setPublicLinkValid(true);
      setPublicRequiresPassword(payload.requiresPassword === true);
    }

    void validatePublicLink().catch((error: unknown) => {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setPublicLinkValid(false);
      setPublicLinkMessage("Share-Link konnte nicht geprüft werden.");
    });

    return () => controller.abort();
  }, [mode, shareToken]);

  useEffect(() => {
    if (submittedData == null || step !== 4) {
      return;
    }

    const standort = submittedData.standort;
    const query = [standort.strasse, `${standort.plz} ${standort.ort}`, standort.land].filter(Boolean).join(", ");
    if (query.length === 0) {
      setMapError("Adresse für Karte fehlt.");
      return;
    }

    const controller = new AbortController();
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

    async function loadMap() {
      setMapError(null);
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error("Kartenservice nicht erreichbar");
      }
      const payload = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      const first = payload[0];
      if (first == null) {
        throw new Error("Standort konnte nicht geokodiert werden");
      }

      const lat = Number(first.lat);
      const lon = Number(first.lon);
      const bbox = [lon - 0.02, lat - 0.02, lon + 0.02, lat + 0.02];
      const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.join(",")}&layer=mapnik&marker=${lat},${lon}`;
      setMapEmbedUrl(embedUrl);
      setMapInfo(first.display_name);
    }

    void loadMap().catch((error: unknown) => {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setMapError(error instanceof Error ? error.message : "Karte konnte nicht geladen werden");
    });

    return () => controller.abort();
  }, [step, submittedData]);

  const landOptions = useMemo(() => getStandortLandOptions("de"), []);
  const progressPercent = (step / 4) * 100;

  const handleNextFromStep1 = async () => {
    const isValid = await form.trigger(stepTriggerFields[1]);
    if (isValid) {
      setStep(2);
      return;
    }
    toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
  };

  const handleNextFromStep2 = async () => {
    const isValid = await form.trigger(stepTriggerFields[2]);
    if (isValid) {
      setStep(3);
      return;
    }
    toast.error("Bitte wählen Sie für alle Kriterien eine Bewertung.");
  };

  const handleSubmit = form.handleSubmit((data) => {
    const submit = async () => {
      setIsSubmittingAnalysis(true);
      try {
        if (mode === "public" && shareToken != null) {
          const response = await fetch(`/api/standortanalyse/share/${shareToken}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              password: publicSubmitPassword.trim() === "" ? undefined : publicSubmitPassword.trim(),
              createOrUpdateContact: true,
              formData: data,
            }),
          });

          const payload = (await response.json()) as { error?: string; analysisId?: string };
          if (!response.ok) {
            throw new Error(payload.error ?? "Öffentliche Einreichung fehlgeschlagen");
          }
          if (typeof payload.analysisId === "string") {
            setAnalysisId(payload.analysisId);
          }
        } else {
          const response = await fetch("/api/standortanalyse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysisId: analysisId ?? undefined,
              submit: true,
              createOrUpdateContact: true,
              formData: data,
            }),
          });
          const payload = (await response.json()) as { error?: string; analysisId?: string };
          if (!response.ok) {
            throw new Error(payload.error ?? "Einreichung fehlgeschlagen");
          }
          if (typeof payload.analysisId === "string") {
            setAnalysisId(payload.analysisId);
          }
        }

        setSubmittedData(data);
        setStep(4);
        void queryClient.invalidateQueries({ queryKey: ["standortanalysen", mode] });
        toast.success("Standortanalyse abgeschlossen");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Einreichung fehlgeschlagen";
        toast.error(message);
      } finally {
        setIsSubmittingAnalysis(false);
      }
    };

    void submit();
  });

  const handleGenerateShareLink = async () => {
    setIsGeneratingShare(true);
    setShareLink(null);

    try {
      const response = await fetch("/api/standortanalyse/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysisId ?? undefined,
          password: shareGenerationPassword.trim() === "" ? undefined : shareGenerationPassword.trim(),
          expiresInHours: shareExpiresHours,
          maxUses: 1,
        }),
      });

      const payload = (await response.json()) as ShareApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Share-Link konnte nicht erstellt werden");
      }
      setAnalysisId(payload.analysisId);
      setShareLink(payload);
      void queryClient.invalidateQueries({ queryKey: ["standortanalysen", mode] });
      toast.success("Share-Link erstellt");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Share-Link konnte nicht erstellt werden";
      toast.error(message);
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleResetForm = () => {
    form.reset(DEFAULT_FORM_VALUES);
    setStep(1);
    setSubmittedData(null);
    setAnalysisId(null);
    setShareLink(null);
    setMapEmbedUrl(null);
    setMapInfo("");
    setMapError(null);
    toast.success("Formular zurückgesetzt");
  };

  const handleLoadAnalysis = async (id: string) => {
    setLoadingAnalysisId(id);
    try {
      const response = await fetch(`/api/standortanalyse/${id}`);
      const payload = (await response.json()) as {
        error?: string;
        formData?: StandortanalyseForm;
        analysis?: { status?: string };
      };
      if (!response.ok || payload.formData == null) {
        throw new Error(payload.error ?? "Analyse konnte nicht geladen werden");
      }
      form.reset(payload.formData);
      setAnalysisId(id);
      setShareLink(null);
      if (payload.analysis?.status === "submitted" || payload.analysis?.status === "completed") {
        setSubmittedData(payload.formData);
        setStep(4);
      } else {
        setSubmittedData(null);
        setStep(1);
      }
      toast.success("Analyse geladen");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse konnte nicht geladen werden");
    } finally {
      setLoadingAnalysisId(null);
    }
  };

  const handleCopyShareLink = async () => {
    if (shareLink == null) {
      return;
    }
    setIsCopyingShareLink(true);
    try {
      await navigator.clipboard.writeText(shareLink.shareUrl);
      toast.success("Share-Link in die Zwischenablage kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    } finally {
      setIsCopyingShareLink(false);
    }
  };

  if (mode === "public" && publicLinkValid == null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share-Link wird geprüft</CardTitle>
          <CardDescription>Bitte einen Moment warten.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (publicLinkValid === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share-Link nicht verfügbar</CardTitle>
          <CardDescription>{publicLinkMessage ?? "Dieser Link ist nicht mehr gültig."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl text-primary">Standortanalyse</CardTitle>
          <CardDescription>
            Standortqualität, Umfeld und Grundlagenbewertung mit CRM-Integration für interne und externe Partner.
          </CardDescription>
          {mode === "public" && shareToken ? (
            <Badge variant="outline" className="w-fit">
              Öffentlicher Zugangslink: {shareToken}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progressPercent} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Schritt {step} von 4, Fortschritt {Math.round(progressPercent)}%
          </p>
        </CardContent>
      </Card>

      {mode === "internal" ? (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-primary" />
              Kunden-Einladungslink
            </CardTitle>
            <CardDescription>
              Jederzeit verfügbar: Link erstellen und direkt an potenzielle Kunden senden, damit sie die Standortanalyse selbst ausfüllen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4" />
                  Passwortschutz
                </FormLabel>
                <Input
                  type="password"
                  value={shareGenerationPassword}
                  onChange={(event) => setShareGenerationPassword(event.target.value)}
                  placeholder="Optional, mindestens 8 Zeichen"
                />
              </div>
              <div className="space-y-2">
                <FormLabel>Gültigkeit</FormLabel>
                <Select
                  value={String(shareExpiresHours)}
                  onValueChange={(value) => setShareExpiresHours(Number.parseInt(value, 10))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Bitte auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 Stunden</SelectItem>
                    <SelectItem value="72">72 Stunden</SelectItem>
                    <SelectItem value="168">7 Tage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="button" className="w-full" onClick={handleGenerateShareLink} disabled={isGeneratingShare}>
                  {isGeneratingShare ? "Erstelle Link..." : "Einladungslink erstellen"}
                </Button>
              </div>
            </div>

            {shareLink ? (
              <div className="rounded-lg border bg-background/90 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">Aktiver Einladungslink</p>
                  <Badge variant="outline">Einmal verwendbar</Badge>
                </div>
                <p className="mt-2 break-all text-primary">{shareLink.shareUrl}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyShareLink} disabled={isCopyingShareLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    {isCopyingShareLink ? "Kopiere..." : "Link kopieren"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Gültig bis {new Date(shareLink.expiresAt).toLocaleString("de-DE")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Noch kein Einladungslink erzeugt. Nach dem Erstellen kann der Kunde sofort starten.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {mode === "internal" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arbeitsstand</CardTitle>
            <CardDescription>
              Entwürfe speichern, später weiterbearbeiten oder abgeschlossene Analysen erneut öffnen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveDraftMutation.mutate()}
                disabled={saveDraftMutation.isPending}
              >
                {saveDraftMutation.isPending ? "Speichere..." : "Entwurf speichern"}
              </Button>
              <Button type="button" variant="outline" onClick={handleResetForm}>
                Neu starten
              </Button>
              {analysisId ? <Badge variant="outline">Aktive Analyse: {analysisId}</Badge> : null}
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Ort</TableHead>
                    <TableHead>Punkte</TableHead>
                    <TableHead>Aktualisiert</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analysesQuery.data ?? []).slice(0, 8).map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell>
                        <Badge variant={analysis.status === "draft" ? "secondary" : "default"}>
                          {analysis.status === "draft" ? "Entwurf" : "Abgeschlossen"}
                        </Badge>
                      </TableCell>
                      <TableCell>{analysis.kontakt_name}</TableCell>
                      <TableCell>{analysis.standort_ort}</TableCell>
                      <TableCell>{analysis.total_points}</TableCell>
                      <TableCell>{new Date(analysis.updated_at).toLocaleString("de-DE")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadAnalysis(analysis.id)}
                          disabled={loadingAnalysisId === analysis.id}
                        >
                          {loadingAnalysisId === analysis.id ? "Lade..." : "Öffnen"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(analysesQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Noch keine gespeicherten Standortanalysen vorhanden.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Stammdaten</CardTitle>
                <CardDescription>Kontaktinformationen und Standortadresse erfassen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <h3 className="font-medium text-primary">Kontakt</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Nachname eingeben" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.vorname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vorname</FormLabel>
                          <FormControl>
                            <Input placeholder="Vorname eingeben" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="E-Mail-Adresse" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.telefon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input placeholder="Telefonnummer" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.strasse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Straße und Hausnummer</FormLabel>
                          <FormControl>
                            <Input placeholder="Straße und Hausnummer" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.firma"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firma</FormLabel>
                          <FormControl>
                            <Input placeholder="Firmenname" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-medium text-primary">Standort</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="standort.plz"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PLZ</FormLabel>
                          <FormControl>
                            <Input placeholder="PLZ" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="standort.ort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ort</FormLabel>
                          <FormControl>
                            <Input placeholder="Ort" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="standort.strasse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Straße</FormLabel>
                          <FormControl>
                            <Input placeholder="Straße und Hausnummer" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="standort.land"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Land</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Land auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {landOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="standort.datum"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Datum</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="standort.erstelltVon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Erstellt von</FormLabel>
                          <FormControl>
                            <Input placeholder="Name des Erstellers" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <FormField
                  control={form.control as Control<StandortanalyseForm>}
                  name="notizen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notizen</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Zusätzliche Hinweise, Risiken und Annahmen"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="button" onClick={handleNextFromStep1}>
                  Weiter zu Standortkriterien
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Standortkriterien</CardTitle>
                <CardDescription>Alle Kriterien inkl. Tooltips bewerten. Unbekannt zählt immer 1 Punkt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Hauptkriterien</h3>
                  {standortKriterien
                    .filter((criterion) => criterion.type === "info" || criterion.type === "main")
                    .map((criterion) => (
                      <FormField
                        key={criterion.id}
                        control={form.control as Control<StandortanalyseForm>}
                        name={`kriterien.${criterion.id}` as KriterienPath}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              {criterion.label}
                              <Tooltip>
                                <TooltipTrigger type="button" className="inline-flex">
                                  <CircleHelp className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-72 text-balance">
                                  {criterion.tooltip}
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(criterion.type === "info" ? value : Number.parseInt(value, 10))
                              }
                              value={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Bitte auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {criterion.options.map((option) => (
                                  <SelectItem
                                    key={`${criterion.id}-${option.label}`}
                                    value={criterion.type === "info" ? option.label : String(option.points)}
                                  >
                                    {option.label}
                                    {criterion.type === "info" ? "" : ` (${option.points} Punkte)`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Optionale Kriterien</h3>
                  {standortKriterien
                    .filter((criterion) => criterion.type === "optional")
                    .map((criterion) => (
                      <FormField
                        key={criterion.id}
                        control={form.control as Control<StandortanalyseForm>}
                        name={`kriterien.${criterion.id}` as KriterienPath}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              {criterion.label}
                              <Tooltip>
                                <TooltipTrigger type="button" className="inline-flex">
                                  <CircleHelp className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-72 text-balance">
                                  {criterion.tooltip}
                                </TooltipContent>
                              </Tooltip>
                            </FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                              value={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Bitte auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {criterion.options.map((option) => (
                                  <SelectItem key={`${criterion.id}-${option.label}`} value={String(option.points)}>
                                    {option.label} ({option.points} Punkte)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Zurück
                </Button>
                <Button type="button" onClick={handleNextFromStep2}>
                  Weiter zur Zusammenfassung
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle>Zusammenfassung</CardTitle>
                <CardDescription>Review aller Angaben vor der finalen Auswertung.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={cn("h-6", scoreBadgeTone[currentScore.recommendation.tone])}>
                    {currentScore.recommendation.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Zwischenstand: {currentScore.totalPoints} / {currentScore.maxPoints} Punkte
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kriterium</TableHead>
                      <TableHead>Punkte</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentScore.criterionEvaluations.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell>
                          {row.points} / {row.maxPoints}
                        </TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {mode === "public" && publicRequiresPassword ? (
                  <Card className="bg-muted/40">
                    <CardHeader>
                      <CardTitle className="text-base">Passwortprüfung</CardTitle>
                      <CardDescription>Dieser Link ist passwortgeschützt. Bitte Passwort vor dem Absenden eingeben.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input
                        type="password"
                        value={publicSubmitPassword}
                        onChange={(event) => setPublicSubmitPassword(event.target.value)}
                        placeholder="Passwort eingeben"
                      />
                    </CardContent>
                  </Card>
                ) : null}

              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Zurück
                </Button>
                <Button type="submit" disabled={isSubmittingAnalysis}>
                  {isSubmittingAnalysis ? "Wird eingereicht..." : "Auswertung erstellen"}
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {step === 4 && submittedData != null ? (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard</CardTitle>
                  <CardDescription>Gesamtbewertung, Empfehlung und Kriterienstati.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-2">
                  <ChartContainer
                    config={{ score: { label: "Score", color: "var(--chart-1)" } }}
                    className="mx-auto h-[260px] w-full max-w-[360px]"
                  >
                    <RadialBarChart
                      innerRadius={80}
                      outerRadius={120}
                      data={[{ name: "score", value: currentScore.totalPercent, fill: "var(--color-score)" }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={10} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    </RadialBarChart>
                  </ChartContainer>

                  <div className="space-y-3">
                    <Badge className={cn("h-6", scoreBadgeTone[currentScore.recommendation.tone])}>
                      {currentScore.recommendation.label}
                    </Badge>
                    {analysisId ? <p className="text-xs text-muted-foreground">Analyse-ID: {analysisId}</p> : null}
                    <p className="text-2xl font-semibold text-primary">
                      {currentScore.totalPoints} / {currentScore.maxPoints} Punkte
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unbekannt markierte Kriterien: {currentScore.unknownCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Hauptkriterien
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ punkte: { label: "Punkte", color: "var(--chart-2)" } }}
                    className="h-[420px] w-full"
                  >
                    <BarChart data={currentScore.mainCriteriaChart} layout="vertical" margin={{ left: 24, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="kriterium" type="category" width={220} tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="punkte" radius={4}>
                        {currentScore.mainCriteriaChart.map((entry) => {
                          const ratio = entry.maxPunkte > 0 ? entry.punkte / entry.maxPunkte : 0;
                          const status = ratio >= 0.7 ? "Gut" : ratio >= 0.4 ? "Mittel" : "Kritisch";
                          return <Cell key={entry.key} fill={CRITERIA_COLORS[status]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ampelübersicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kriterium</TableHead>
                        <TableHead>Punkte</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentScore.criterionEvaluations.map((criterion) => (
                        <TableRow key={criterion.id}>
                          <TableCell>{criterion.label}</TableCell>
                          <TableCell>
                            {criterion.points}/{criterion.maxPoints}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: CRITERIA_COLORS[criterion.status] }}
                              />
                              {criterion.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    Standortkarte
                  </CardTitle>
                  {mapInfo.length > 0 ? <CardDescription>{mapInfo}</CardDescription> : null}
                </CardHeader>
                <CardContent>
                  {mapError ? <p className="text-sm text-destructive">{mapError}</p> : null}
                  {mapEmbedUrl ? (
                    <iframe
                      title="Standortkarte"
                      src={mapEmbedUrl}
                      className="h-[360px] w-full rounded-lg border"
                      loading="lazy"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Karte wird geladen...</p>
                  )}
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  Zurück zur Zusammenfassung
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </Form>
    </div>
  );
}
