"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Copy,
  FileText,
  Link2,
  LockKeyhole,
  Mail,
  MapPinned,
  Signpost,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import StandortanalysenTable, {
  type StandortanalyseListFilter,
  type StandortanalyseListItem,
} from "@/components/tables/StandortanalysenTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getStandortLandOptions } from "@/lib/standortanalyse/countries";
import { standortKriterien } from "@/lib/standortanalyse/criteria";
import { calculateStandortScore } from "@/lib/standortanalyse/scoring";
import { isPlaceholderInviteEmail } from "@/lib/standortanalyse/share-invite-email";
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
  emailSent?: boolean;
  emailError?: string | null;
};

type LastShareLinkMeta = {
  analysisId: string;
  shareUrl?: string;
  expiresAt: string;
  maxUses: number;
  createdAt?: string;
  usedCount?: number;
  isActive?: boolean;
  passwordProtected?: boolean;
};

type SectionId = "context" | "form" | "share" | "workspace";

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

function toPersistableDraftForm(values: StandortanalyseForm): StandortanalyseForm {
  const now = new Date();
  const safeEmail =
    values.kontakt.email.trim().length > 0
      ? values.kontakt.email
      : `draft-${now.getTime()}@aquadock.invalid`;

  return {
    ...values,
    kontakt: {
      ...values.kontakt,
      name: values.kontakt.name.trim().length > 0 ? values.kontakt.name : "Entwurf",
      vorname: values.kontakt.vorname.trim().length > 0 ? values.kontakt.vorname : "Entwurf",
      email: safeEmail,
    },
    standort: {
      ...values.standort,
      plz: values.standort.plz.trim().length > 0 ? values.standort.plz : "00000",
      ort: values.standort.ort.trim().length > 0 ? values.standort.ort : "Offen",
      land: values.standort.land.trim().length > 0 ? values.standort.land : "DE",
      datum: values.standort.datum.trim().length > 0 ? values.standort.datum : now.toISOString().slice(0, 10),
    },
  };
}

type SectionCardProps = {
  id: SectionId;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
};

function SectionCard({ id, open, onOpenChange, icon, title, description, badge, meta, children, accent }: SectionCardProps) {
  const sectionLabel = `${id}-section`;
  return (
    <Card className={cn(accent === true ? "border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background" : undefined)}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={sectionLabel}
        className="flex w-full items-start gap-3 px-4 py-5 text-left sm:px-6"
      >
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-primary">
          {icon}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold tracking-tight">{title}</span>
            {badge}
          </div>
          {description ? (
            <span className="text-sm text-muted-foreground">{description}</span>
          ) : null}
          {meta ? <div className="break-words pt-1 text-xs text-muted-foreground">{meta}</div> : null}
        </div>
        <ChevronDown
          className={cn(
            "mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      {open ? (
        <div id={sectionLabel} className="border-t bg-background/60 px-4 py-6 sm:px-6">
          {children}
        </div>
      ) : null}
    </Card>
  );
}

type WizardStep = { id: 1 | 2 | 3 | 4; label: string };

function WizardStepper({ step, mode }: { step: number; mode: WizardMode }) {
  const steps: WizardStep[] = [
    { id: 1, label: "Stammdaten" },
    { id: 2, label: "Kriterien" },
    { id: 3, label: "Zusammenfassung" },
    { id: 4, label: mode === "public" ? "Bestätigung" : "Auswertung" },
  ];

  const current = steps.find((s) => s.id === step) ?? steps[0];
  const currentLabel = current?.label ?? steps[0]?.label ?? "";

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Schritt {step} von {steps.length}
        </p>
        <p className="text-sm font-medium text-foreground">{currentLabel}</p>
      </div>
      <ol className="flex items-center gap-2 overflow-hidden" aria-label="Wizard-Fortschritt">
        {steps.map((s, index) => {
          const isComplete = step > s.id;
          const isCurrent = step === s.id;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isComplete && "bg-primary text-primary-foreground shadow-sm",
                    isCurrent &&
                      !isComplete &&
                      "border-2 border-primary bg-background text-primary ring-4 ring-primary/15",
                    !isComplete &&
                      !isCurrent &&
                      "border border-border bg-background text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : s.id}
                </span>
                <span
                  className={cn(
                    "hidden max-w-[8rem] truncate text-sm lg:inline",
                    isCurrent && "font-medium text-foreground",
                    isComplete && "text-muted-foreground",
                    !isCurrent && !isComplete && "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    "h-px flex-1 transition-colors",
                    step > s.id ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const GUIDING_QUESTIONS = [
  "Ist der Standort generell für eine Station geeignet?",
  "Welche Faktoren müssen bei einer Realisierung besonders beachtet werden?",
  "Welche Annahmen sind für eine Erfolgsberechnung realistisch?",
  "Sind Ergänzungsinvestitionen nötig?",
] as const;

export function StandortanalyseWizard({
  mode = "internal",
  shareToken,
  initialAnalysisId,
}: {
  mode?: WizardMode;
  shareToken?: string;
  initialAnalysisId?: string;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submittedData, setSubmittedData] = useState<StandortanalyseForm | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [loadingAnalysisId, setLoadingAnalysisId] = useState<string | null>(null);
  const [shareGenerationPassword, setShareGenerationPassword] = useState("");
  const [shareExpiresHours, setShareExpiresHours] = useState(24);
  const [shareRecipientEmail, setShareRecipientEmail] = useState("");
  const [shareRecipientTouched, setShareRecipientTouched] = useState(false);
  const [sendInviteByEmail, setSendInviteByEmail] = useState(true);
  const [shareLink, setShareLink] = useState<ShareApiResponse | null>(null);
  const [lastShareLinkMeta, setLastShareLinkMeta] = useState<LastShareLinkMeta | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isCopyingShareLink, setIsCopyingShareLink] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [revokeOlderLinks, setRevokeOlderLinks] = useState(false);
  const [isSubmittingAnalysis, setIsSubmittingAnalysis] = useState(false);
  const [publicSubmitPassword, setPublicSubmitPassword] = useState("");
  const [publicSubmissionDone, setPublicSubmissionDone] = useState(false);
  const [analysisFilter, setAnalysisFilter] = useState<StandortanalyseListFilter>("all");
  const [publicLinkValid, setPublicLinkValid] = useState<boolean | null>(mode === "public" ? null : true);
  const [publicRequiresPassword, setPublicRequiresPassword] = useState(false);
  const [publicLinkMessage, setPublicLinkMessage] = useState<string | null>(null);
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
  const [mapInfo, setMapInfo] = useState<string>("");
  const [mapError, setMapError] = useState<string | null>(null);
  const initialAutoLoadDone = useRef(false);

  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(() => ({
    context: false,
    form: true,
    share: false,
    workspace: false,
  }));

  const toggleSection = useCallback((id: SectionId, next: boolean) => {
    setOpenSections((prev) => ({ ...prev, [id]: next }));
  }, []);

  const form = useForm<StandortanalyseForm>({
    resolver: zodResolver(standortanalyseFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onTouched",
  });

  const clearActiveForm = useCallback(() => {
    form.reset(DEFAULT_FORM_VALUES);
    setStep(1);
    setSubmittedData(null);
    setAnalysisId(null);
    setShareLink(null);
    setMapEmbedUrl(null);
    setMapInfo("");
    setMapError(null);
    setPublicSubmissionDone(false);
  }, [form]);

  const currentValues = form.watch();
  const kontaktEmail = form.watch("kontakt.email");
  const kontaktVorname = form.watch("kontakt.vorname");
  const kontaktName = form.watch("kontakt.name");
  const currentScore = useMemo(() => calculateStandortScore(currentValues.kriterien), [currentValues.kriterien]);

  const shareRecipientEmailValid = useMemo(() => {
    const email = shareRecipientEmail.trim();
    if (email.length === 0 || isPlaceholderInviteEmail(email)) {
      return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [shareRecipientEmail]);

  useEffect(() => {
    if (shareRecipientTouched) {
      return;
    }
    const email = kontaktEmail.trim();
    if (email.length > 0 && !isPlaceholderInviteEmail(email)) {
      setShareRecipientEmail(email);
    }
  }, [kontaktEmail, shareRecipientTouched]);

  const analysesQuery = useQuery({
    queryKey: ["standortanalysen", mode],
    queryFn: async () => {
      if (mode !== "internal") {
        return [] as StandortanalyseListItem[];
      }
      const response = await fetch("/api/standortanalyse");
      const payload = (await response.json()) as { analyses?: StandortanalyseListItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Analysen konnten nicht geladen werden");
      }
      return payload.analyses ?? [];
    },
    enabled: mode === "internal",
  });
  const filteredAnalyses = useMemo(() => {
    return (analysesQuery.data ?? []).filter((analysis) => {
      if (analysisFilter === "all") {
        return true;
      }
      if (analysisFilter === "draft") {
        return analysis.status === "draft";
      }
      return analysis.status !== "draft";
    });
  }, [analysesQuery.data, analysisFilter]);

  const draftCount = useMemo(
    () => (analysesQuery.data ?? []).filter((analysis) => analysis.status === "draft").length,
    [analysesQuery.data],
  );

  const lastShareMetaQuery = useQuery({
    queryKey: ["standortanalyse-last-share-meta", analysisId],
    queryFn: async () => {
      if (mode !== "internal" || analysisId == null) {
        return null as LastShareLinkMeta | null;
      }
      const response = await fetch(`/api/standortanalyse/share?analysisId=${analysisId}`);
      const payload = (await response.json()) as {
        lastShareLink?: LastShareLinkMeta | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Letzter Share-Link konnte nicht geladen werden");
      }
      return payload.lastShareLink ?? null;
    },
    enabled: mode === "internal" && analysisId != null,
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
          formData: toPersistableDraftForm(form.getValues()),
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

  const syncCrmMutation = useMutation({
    mutationFn: async (args: {
      analysisId: string;
      createContact: boolean;
      createCompany: boolean;
    }) => {
      const loadResponse = await fetch(`/api/standortanalyse/${args.analysisId}`);
      const loaded = (await loadResponse.json()) as {
        error?: string;
        formData?: StandortanalyseForm;
      };
      if (!loadResponse.ok || loaded.formData == null) {
        throw new Error(loaded.error ?? "Analyse konnte nicht geladen werden");
      }

      const response = await fetch("/api/standortanalyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: args.analysisId,
          submit: false,
          createOrUpdateContact: args.createContact,
          createOrUpdateCompany: args.createCompany,
          formData: loaded.formData,
        }),
      });
      const payload = (await response.json()) as {
        analysisId?: string;
        error?: string;
        crm?: { contactId?: string | null; companyId?: string | null };
      };
      if (!response.ok || typeof payload.analysisId !== "string") {
        throw new Error(payload.error ?? "CRM-Einträge konnten nicht erstellt werden");
      }
      return payload;
    },
    onSuccess: (payload) => {
      void queryClient.invalidateQueries({ queryKey: ["standortanalysen", mode] });
      const hasContact = payload.crm?.contactId != null;
      const hasCompany = payload.crm?.companyId != null;
      if (hasContact && hasCompany) {
        toast.success("Kontakt und Firma wurden mit der Analyse verknüpft");
        return;
      }
      if (hasContact) {
        toast.success("Kontakt wurde mit der Analyse verknüpft");
        return;
      }
      if (hasCompany) {
        toast.success("Firma wurde mit der Analyse verknüpft");
        return;
      }
      toast.success("Analyse wurde im CRM synchronisiert");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "CRM-Synchronisierung fehlgeschlagen");
    },
  });

  const deleteAnalysisMutation = useMutation({
    mutationFn: async (targetAnalysisId: string) => {
      const response = await fetch(`/api/standortanalyse/${targetAnalysisId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Analyse konnte nicht gelöscht werden");
      }
      return targetAnalysisId;
    },
    onSuccess: (deletedAnalysisId) => {
      setAnalysisId((activeId) => {
        if (activeId === deletedAnalysisId) {
          clearActiveForm();
          return null;
        }
        return activeId;
      });
      void queryClient.invalidateQueries({ queryKey: ["standortanalysen", mode] });
      toast.success("Analyse gelöscht");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Analyse konnte nicht gelöscht werden");
    },
  });

  useEffect(() => {
    if (mode !== "internal" || analysisId == null) {
      setLastShareLinkMeta(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`standortanalyse:last-share-link:${analysisId}`);
      if (raw == null) {
        return;
      }
      const parsed = JSON.parse(raw) as LastShareLinkMeta;
      if (parsed.analysisId === analysisId) {
        setLastShareLinkMeta(parsed);
      }
    } catch {
      // ignore invalid local cache
    }
  }, [analysisId, mode]);

  useEffect(() => {
    const meta = lastShareMetaQuery.data;
    if (meta == null) {
      return;
    }
    setLastShareLinkMeta((prev) => {
      const preservedShareUrl = prev != null && prev.analysisId === meta.analysisId ? prev.shareUrl : undefined;
      return {
        ...meta,
        shareUrl: preservedShareUrl,
      };
    });
  }, [lastShareMetaQuery.data]);

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
    if (mode !== "internal" || submittedData == null || step !== 4) {
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
  }, [mode, step, submittedData]);

  const landOptions = useMemo(() => getStandortLandOptions("de"), []);

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
      if (mode === "public" && publicRequiresPassword && publicSubmitPassword.trim() === "") {
        toast.error("Bitte gib das Passwort ein, bevor Du die Daten sendest.");
        return;
      }
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
            if (response.status === 401) {
              throw new Error(
                "Das eingegebene Passwort ist nicht korrekt. Pruefe die Einladungsdaten oder kontaktiere Deinen Ansprechpartner.",
              );
            }
            throw new Error(payload.error ?? "Öffentliche Einreichung fehlgeschlagen");
          }
          if (typeof payload.analysisId === "string") {
            setAnalysisId(payload.analysisId);
          }
          setPublicSubmissionDone(true);
          setStep(4);
          toast.success("Vielen Dank. Ihre Angaben wurden erfolgreich übermittelt.");
          return;
        }
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
    if (sendInviteByEmail && !shareRecipientEmailValid) {
      toast.error("Bitte eine gültige Empfänger-E-Mail angeben oder den E-Mail-Versand deaktivieren.");
      return;
    }

    const trimmedSharePassword = shareGenerationPassword.trim();
    if (trimmedSharePassword.length > 0 && trimmedSharePassword.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }

    setIsGeneratingShare(true);
    setShareLink(null);

    const recipientName = [kontaktVorname, kontaktName]
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(" ");

    try {
      const shareRequestBody = {
        analysisId: analysisId ?? undefined,
        password: trimmedSharePassword === "" ? undefined : trimmedSharePassword,
        expiresInHours: shareExpiresHours,
        maxUses: 1,
        revokeOlderLinks,
        sendInviteEmail: sendInviteByEmail,
        recipientEmail: sendInviteByEmail ? shareRecipientEmail.trim() : undefined,
        recipientName: recipientName.length > 0 ? recipientName : undefined,
      };
      const response = await fetch("/api/standortanalyse/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareRequestBody),
      });

      const payload = (await response.json()) as ShareApiResponse & {
        error?: string;
        issues?: { fieldErrors?: Record<string, string[]> };
      };
      if (!response.ok) {
        const fieldErrors = payload.issues?.fieldErrors;
        const fieldError =
          fieldErrors?.password?.[0] ??
          fieldErrors?.recipientEmail?.[0] ??
          fieldErrors?.analysisId?.[0] ??
          fieldErrors?.expiresInHours?.[0];
        throw new Error(fieldError ?? payload.error ?? "Share-Link konnte nicht erstellt werden");
      }
      setAnalysisId(payload.analysisId);
      setShareLink(payload);
      setLastShareLinkMeta({
        analysisId: payload.analysisId,
        shareUrl: payload.shareUrl,
        expiresAt: payload.expiresAt,
        maxUses: payload.maxUses,
        createdAt: new Date().toISOString(),
        usedCount: 0,
        isActive: true,
      });
      window.localStorage.setItem(
        `standortanalyse:last-share-link:${payload.analysisId}`,
        JSON.stringify({
          analysisId: payload.analysisId,
          shareUrl: payload.shareUrl,
          expiresAt: payload.expiresAt,
          maxUses: payload.maxUses,
          createdAt: new Date().toISOString(),
          usedCount: 0,
          isActive: true,
        } satisfies LastShareLinkMeta),
      );
      void queryClient.invalidateQueries({ queryKey: ["standortanalysen", mode] });
      if (payload.emailSent) {
        toast.success("Einladungslink erstellt und per E-Mail gesendet");
      } else if (sendInviteByEmail) {
        toast.warning(
          payload.emailError != null && payload.emailError !== ""
            ? `Link erstellt. E-Mail konnte nicht gesendet werden: ${payload.emailError}`
            : "Link erstellt. E-Mail konnte nicht gesendet werden.",
        );
      } else {
        toast.success("Einladungslink erstellt");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Share-Link konnte nicht erstellt werden";
      toast.error(message);
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleResetForm = () => {
    clearActiveForm();
    toast.success("Formular zurückgesetzt");
  };

  const handleLoadAnalysis = useCallback(
    async (id: string, intent: "view" | "edit") => {
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
        const isSubmitted =
          payload.analysis?.status === "submitted" || payload.analysis?.status === "completed";

        if (intent === "edit") {
          setSubmittedData(null);
          setStep(1);
        } else if (isSubmitted) {
          setSubmittedData(payload.formData);
          setStep(4);
        } else {
          setSubmittedData(null);
          setStep(3);
        }

        setPublicSubmissionDone(false);
        toggleSection("form", true);
        toggleSection("workspace", false);
        toast.success(intent === "edit" ? "Analyse zum Bearbeiten geladen" : "Analyse angezeigt");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Analyse konnte nicht geladen werden");
      } finally {
        setLoadingAnalysisId(null);
      }
    },
    [form, toggleSection],
  );

  useEffect(() => {
    if (mode !== "internal" || initialAnalysisId == null || analysisId != null || loadingAnalysisId != null) {
      return;
    }
    if (initialAutoLoadDone.current) {
      return;
    }
    initialAutoLoadDone.current = true;
    void handleLoadAnalysis(initialAnalysisId, "view");
  }, [analysisId, handleLoadAnalysis, initialAnalysisId, loadingAnalysisId, mode]);

  const handleCopyShareLink = async () => {
    if (shareLink == null) {
      return;
    }
    setIsCopyingShareLink(true);
    try {
      await navigator.clipboard.writeText(shareLink.shareUrl);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 2000);
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

  if (mode === "public" && publicSubmissionDone) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Vielen Dank fuer Deine Anfrage
            </CardTitle>
            <CardDescription>
              Deine Standortanalyse wurde erfolgreich an AquaDock uebermittelt. Du erhaeltst eine
              Bestaetigungs-E-Mail, und unser Team meldet sich zeitnah mit der fachlichen Auswertung bei Dir.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Was passiert als Naechstes?</CardTitle>
            <CardDescription>Transparenter Ablauf fuer Deine Standortbewertung.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1. Wir pruefen Deine Angaben intern und ergaenzen die technische Standortbewertung.</li>
              <li>2. Du erhaeltst in der Regel innerhalb von 1-2 Werktagen eine erste Rueckmeldung.</li>
              <li>3. Bei Rueckfragen oder fehlenden Angaben kontaktieren wir Dich per E-Mail oder Telefon.</li>
              <li>4. Die finale Empfehlung und naechsten Schritte besprechen wir persoenlich mit Dir.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
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

  const headerCard = (
    <Card className="border-dashed">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl text-primary">Standortanalyse</CardTitle>
        <CardDescription>
          Standortqualität, Umfeld und Grundlagenbewertung mit CRM-Integration für interne und externe Partner.
        </CardDescription>
        {mode === "public" && shareToken ? (
          <Badge variant="outline" className="w-fit max-w-full break-all">
            Öffentlicher Zugangslink: {shareToken}
          </Badge>
        ) : null}
      </CardHeader>
    </Card>
  );

  const contextSection = (
    <SectionCard
      id="context"
      open={openSections.context}
      onOpenChange={(next) => toggleSection("context", next)}
      icon={<Signpost className="h-4 w-4" />}
      title="Kontext & Ziel der Analyse"
      description="Standortqualität, Umfeld und Grundlagenbewertung im strukturierten Vorgehen."
      badge={<Badge variant="outline">Leitfragen</Badge>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Die Standortanalyse beantwortet die wesentlichen Fragen, bevor in eine Realisierung investiert wird, und
            schafft eine belastbare Grundlage für die nächsten Entscheidungen.
          </p>
          <ul className="space-y-2 text-sm">
            {GUIDING_QUESTIONS.map((question) => (
              <li key={question} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          {mode === "public" ? (
            <p>
              Ihre Angaben werden vertraulich behandelt. Die fachliche Auswertung und Ergebnisinterpretation erfolgen
              ausschließlich durch das AquaDock-Team. Sie erhalten anschließend persönlich eine fundierte Einschätzung.
            </p>
          ) : (
            <p>
              Hinweis: Externe Personen können diese Analyse über einen sicheren Einladungslink ausfüllen, sehen aber
              keine Ergebnisse. Die Auswertung verbleibt vollständig im CRM.
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );

  const shareSection =
    mode === "internal" ? (
      <SectionCard
        id="share"
        open={openSections.share}
        onOpenChange={(next) => toggleSection("share", next)}
        icon={<Link2 className="h-4 w-4" />}
        title="Kunden-Einladungslink"
        description="Sicheren Link erzeugen und optional direkt per E-Mail an den Kunden senden (SMTP in den Einstellungen erforderlich)."
        badge={lastShareLinkMeta?.isActive ? <Badge variant="outline">Aktiv</Badge> : null}
        meta={
          lastShareLinkMeta
            ? `Letzter Link: gültig bis ${new Date(lastShareLinkMeta.expiresAt).toLocaleString("de-DE")}`
            : "Noch kein Link erzeugt"
        }
        accent
      >
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2" htmlFor="share-recipient-email">
                <Mail className="h-4 w-4" />
                Empfänger-E-Mail
              </Label>
              <Input
                id="share-recipient-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={shareRecipientEmail}
                onChange={(event) => {
                  setShareRecipientTouched(true);
                  setShareRecipientEmail(event.target.value);
                }}
                placeholder="kunde@beispiel.de"
              />
              <p className="text-xs text-muted-foreground">
                Wird aus den Stammdaten übernommen, sobald eine gültige E-Mail hinterlegt ist.
              </p>
            </div>
            <div className="flex items-end">
              <div className="flex w-full items-center gap-3 rounded-md border p-3">
                <Switch
                  id="send-invite-by-email"
                  checked={sendInviteByEmail}
                  onCheckedChange={setSendInviteByEmail}
                  disabled={!shareRecipientEmailValid}
                />
                <Label htmlFor="send-invite-by-email" className="cursor-pointer text-sm font-normal leading-snug">
                  Einladung per E-Mail senden
                </Label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4" />
                Passwortschutz
              </Label>
              <Input
                type="password"
                value={shareGenerationPassword}
                onChange={(event) => setShareGenerationPassword(event.target.value)}
                placeholder="Optional, mindestens 8 Zeichen"
              />
            </div>
            <div className="space-y-2">
              <Label>Gültigkeit</Label>
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
                {isGeneratingShare
                  ? "Erstelle Link..."
                  : sendInviteByEmail
                    ? "Erstellen und per E-Mail senden"
                    : "Einladungslink erstellen"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="revoke-older-links">Neuen Link erzwingen</Label>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch id="revoke-older-links" checked={revokeOlderLinks} onCheckedChange={setRevokeOlderLinks} />
                <p className="text-xs text-muted-foreground">Ältere aktive Links dieser Analyse deaktivieren</p>
              </div>
            </div>
          </div>

          {shareLink ? (
            <div className="rounded-lg border bg-background/90 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Aktiver Einladungslink</p>
                <Badge variant="outline">Einmal verwendbar</Badge>
              </div>
              <p className="mt-2 break-all text-primary">{shareLink.shareUrl}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyShareLink}
                  disabled={isCopyingShareLink}
                  className="w-full sm:w-auto"
                >
                  {copiedShareLink ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {isCopyingShareLink ? "Kopiere..." : copiedShareLink ? "Kopiert" : "Link kopieren"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Gültig bis {new Date(shareLink.expiresAt).toLocaleString("de-DE")}
                </span>
                {shareLink.emailSent ? (
                  <Badge variant="outline" className="w-fit">
                    E-Mail gesendet
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : lastShareLinkMeta ? (
            <div className="rounded-lg border bg-background/90 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Zuletzt erstellter Link</p>
                <Badge variant="outline">{lastShareLinkMeta.isActive ? "Aktiv" : "Inaktiv"}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                {lastShareLinkMeta.shareUrl
                  ? "Lokaler Verlauf verfügbar."
                  : "Aus Sicherheitsgründen ist die URL nur direkt nach dem Erstellen sichtbar."}
              </p>
              {lastShareLinkMeta.shareUrl ? (
                <p className="mt-2 break-all text-primary">{lastShareLinkMeta.shareUrl}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Gültig bis {new Date(lastShareLinkMeta.expiresAt).toLocaleString("de-DE")}</span>
                {lastShareLinkMeta.createdAt ? (
                  <span>Erstellt: {new Date(lastShareLinkMeta.createdAt).toLocaleString("de-DE")}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Noch kein Einladungslink erzeugt. Nach dem Erstellen kann der Kunde sofort starten.
            </p>
          )}
        </div>
      </SectionCard>
    ) : null;

  const workspaceSection =
    mode === "internal" ? (
      <SectionCard
        id="workspace"
        open={openSections.workspace}
        onOpenChange={(next) => toggleSection("workspace", next)}
        icon={<ClipboardList className="h-4 w-4" />}
        title="Gespeicherte Analysen"
        description="Gespeicherte Entwürfe und abgeschlossene Analysen öffnen — getrennt vom aktuellen Formular."
        badge={draftCount > 0 ? <Badge variant="secondary">{draftCount} Entwürfe</Badge> : null}
      >
        <StandortanalysenTable
          analyses={filteredAnalyses}
          loading={analysesQuery.isLoading}
          statusFilter={analysisFilter}
          onStatusFilterChange={setAnalysisFilter}
          onView={(id) => void handleLoadAnalysis(id, "view")}
          onEdit={(id) => void handleLoadAnalysis(id, "edit")}
          onSyncCrm={(id, options) =>
            syncCrmMutation.mutate({
              analysisId: id,
              createContact: options.createContact,
              createCompany: options.createCompany,
            })
          }
          onDelete={(id) => deleteAnalysisMutation.mutate(id)}
          loadingId={loadingAnalysisId}
          syncingId={syncCrmMutation.isPending ? (syncCrmMutation.variables?.analysisId ?? null) : null}
          deletingId={deleteAnalysisMutation.isPending ? (deleteAnalysisMutation.variables ?? null) : null}
        />
      </SectionCard>
    ) : null;

  const formSection = (
    <SectionCard
      id="form"
      open={openSections.form}
      onOpenChange={(next) => toggleSection("form", next)}
      icon={<FileText className="h-4 w-4" />}
      title="Analyse ausfüllen"
      description="Schrittweise: Stammdaten erfassen, Kriterien bewerten, Zusammenfassung prüfen."
      meta={mode === "internal" && analysisId ? `Aktive Analyse: ${analysisId}` : undefined}
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6 pb-24 sm:pb-0">
          <WizardStepper step={step} mode={mode} />
          {mode === "internal" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveDraftMutation.mutate()}
                disabled={saveDraftMutation.isPending}
                className="w-full sm:w-auto"
              >
                {saveDraftMutation.isPending ? "Speichere..." : "Entwurf speichern"}
              </Button>
              <Button type="button" variant="outline" onClick={handleResetForm} className="w-full sm:w-auto">
                Neu starten
              </Button>
            </div>
          ) : null}
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
                            <Input autoComplete="family-name" placeholder="Nachname eingeben" {...field} />
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
                            <Input autoComplete="given-name" placeholder="Vorname eingeben" {...field} />
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
                            <Input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              placeholder="E-Mail-Adresse"
                              {...field}
                            />
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
                            <Input
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              maxLength={50}
                              placeholder="+49 171 1234567"
                              {...field}
                              value={field.value ?? ""}
                            />
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
                            <Input
                              autoComplete="street-address"
                              placeholder="Straße und Hausnummer"
                              {...field}
                              value={field.value ?? ""}
                            />
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
                            <Input autoComplete="organization" placeholder="Firmenname" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.plz"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PLZ (Kontakt, optional)</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="text"
                              autoComplete="postal-code"
                              maxLength={12}
                              placeholder="z. B. 10115"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as Control<StandortanalyseForm>}
                      name="kontakt.ort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ort (Kontakt, optional)</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="address-level2"
                              placeholder="z. B. Berlin"
                              {...field}
                              value={field.value ?? ""}
                            />
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
                            <Input
                              inputMode="text"
                              autoComplete="postal-code"
                              maxLength={12}
                              placeholder="z. B. 10115"
                              {...field}
                            />
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
                            <Input autoComplete="address-level2" placeholder="Ort" {...field} />
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
                            <Input
                              autoComplete="street-address"
                              placeholder="Straße und Hausnummer"
                              {...field}
                              value={field.value ?? ""}
                            />
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
              <CardFooter className="hidden sm:flex sm:justify-end">
                <Button type="button" onClick={handleNextFromStep1} className="w-full sm:w-auto">
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
              <CardFooter className="hidden sm:flex sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto">
                  Zurück
                </Button>
                <Button type="button" onClick={handleNextFromStep2} className="w-full sm:w-auto">
                  Weiter zur Zusammenfassung
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {mode === "public" ? <ClipboardList className="h-4 w-4 text-primary" /> : null}
                  Zusammenfassung
                </CardTitle>
                <CardDescription>
                  {mode === "public"
                    ? "Prüfe Deine Angaben vor dem Versand an das AquaDock-Team."
                    : "Review aller Angaben vor der finalen Auswertung."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {mode === "internal" ? (
                  <>
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
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-linear-to-br from-background to-muted/40 p-5">
                      <p className="text-sm font-medium text-foreground">
                        Bitte prüfe Deine Angaben jetzt in Ruhe. Nach dem Versand erhältst Du eine Bestätigung per
                        E-Mail.
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Die fachliche Bewertung und Ergebnisinterpretation erfolgt ausschließlich intern durch das
                        AquaDock-Team.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                      <div className="rounded-lg border bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kontakt</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="font-medium text-foreground">
                            {currentValues.kontakt.vorname} {currentValues.kontakt.name}
                          </p>
                          <p className="text-muted-foreground">{currentValues.kontakt.email}</p>
                          {currentValues.kontakt.telefon != null && currentValues.kontakt.telefon !== "" ? (
                            <p className="text-muted-foreground">{currentValues.kontakt.telefon}</p>
                          ) : null}
                          {currentValues.kontakt.firma != null && currentValues.kontakt.firma !== "" ? (
                            <p className="text-muted-foreground">{currentValues.kontakt.firma}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-lg border bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Standort</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="font-medium text-foreground">
                            {currentValues.standort.plz} {currentValues.standort.ort}
                          </p>
                          {currentValues.standort.strasse != null && currentValues.standort.strasse !== "" ? (
                            <p className="text-muted-foreground">{currentValues.standort.strasse}</p>
                          ) : null}
                          <p className="text-muted-foreground">
                            {landOptions.find((option) => option.value === currentValues.standort.land)?.label ??
                              currentValues.standort.land}
                          </p>
                          <p className="text-muted-foreground">
                            Datum:{" "}
                            {new Date(currentValues.standort.datum).toLocaleDateString("de-DE", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-primary/5 p-4">
                      <p className="text-sm font-medium text-foreground">Transparenter Ablauf nach dem Versand</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                        <li>1. Dein Datensatz wird intern auf Vollständigkeit und Plausibilität geprüft.</li>
                        <li>2. Das Team erstellt die Standortempfehlung inklusive nächster Schritte.</li>
                        <li>3. Du erhältst zeitnah die persönliche Rückmeldung von AquaDock.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {mode === "public" && publicRequiresPassword ? (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-base">Passwort erforderlich</CardTitle>
                      <CardDescription>
                        Dieser Link ist passwortgeschuetzt. Gib das von AquaDock bereitgestellte Passwort ein, bevor Du
                        Deine Angaben sendest.
                      </CardDescription>
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
              <CardFooter className="hidden sm:flex sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full sm:w-auto">
                  Zurück
                </Button>
                <Button type="submit" disabled={isSubmittingAnalysis} className="w-full sm:w-auto">
                  {isSubmittingAnalysis
                    ? "Wird eingereicht..."
                    : mode === "public"
                      ? "Daten an AquaDock senden"
                      : "Auswertung erstellen"}
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {step === 4 && submittedData != null && mode === "internal" ? (
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
              <div className="hidden sm:flex sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setStep(3)} className="w-full sm:w-auto">
                  Zurück zur Zusammenfassung
                </Button>
              </div>
            </div>
          ) : null}

          <div className="sticky bottom-3 z-20 sm:hidden">
            <div className="rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((itemStep) => (
                    <span
                      key={itemStep}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-all",
                        step === itemStep && "w-4 bg-primary",
                        step > itemStep && "bg-primary/80",
                        step < itemStep && "bg-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Schritt {step} von 4
                </p>
              </div>

              {step === 1 ? (
                <Button type="button" onClick={handleNextFromStep1} className="w-full">
                  Weiter zu Standortkriterien
                </Button>
              ) : null}

              {step === 2 ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                    Zurück
                  </Button>
                  <Button type="button" onClick={handleNextFromStep2} className="w-full">
                    Weiter
                  </Button>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full">
                    Zurück
                  </Button>
                  <Button type="submit" disabled={isSubmittingAnalysis} className="w-full">
                    {isSubmittingAnalysis
                      ? "Wird eingereicht..."
                      : mode === "public"
                        ? "Senden"
                        : "Auswertung"}
                  </Button>
                </div>
              ) : null}

              {step === 4 && submittedData != null && mode === "internal" ? (
                <Button type="button" variant="outline" onClick={() => setStep(3)} className="w-full">
                  Zurück zur Zusammenfassung
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </Form>
    </SectionCard>
  );

  return (
    <div className="space-y-6">
      {headerCard}
      <div className="space-y-3">
        {contextSection}
        {formSection}
        {shareSection}
        {workspaceSection}
      </div>
    </div>
  );
}
