// src/app/(protected)/settings/ClientSettingsPage.tsx
// This file defines the ClientSettingsPage component, which is the main settings page for the application. It includes sections for notifications, appearance, OpenMap settings, and SMTP email settings. Users can configure their preferences and save them, with changes being persisted to the database and local storage as needed.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Bell, Layers, Loader2, Mail, MapPin, Palette, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import SmtpSettings from "@/components/email/SmtpSettings";
import { AppearanceTimezoneSelect } from "@/components/features/settings/AppearanceTimezoneSelect";
import {
  applyAppearanceColorTokens,
} from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPageSkeleton } from "@/components/ui/page-list-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveNotificationPreferencesAction } from "@/lib/actions/notifications";
import { saveTrashBinPreferenceAction } from "@/lib/actions/trash-settings";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { NOTIFICATION_DEFAULTS, NOTIFICATION_UI } from "@/lib/constants/notifications";
import {
  OPENMAP_DEFAULT_MAX_POIS,
  OPENMAP_DEFAULT_TTL_MINUTES,
  type OpenmapCacheTtlMinutes,
  type OpenmapMaxPoisMemory,
} from "@/lib/constants/openmap-user-settings";
import { APPEARANCE_COLOR_SCHEME_IDS, APPEARANCE_COLOR_SWATCH } from "@/lib/constants/theme";
import { useFormat, useT } from "@/lib/i18n/use-translations";
import { loadMapSettings, saveMapSettings } from "@/lib/services/map-settings";
import {
  DEFAULT_APPEARANCE,
  fetchNotificationPreferences,
  fetchTrashBinPreference,
  loadAppearanceSettings,
  saveAppearanceColorScheme,
  saveAppearanceLocale,
  saveAppearanceTheme,
  saveAppearanceTimeZone,
  TRASH_BIN_DEFAULT_ENABLED,
  TRASH_BIN_UI,
} from "@/lib/services/user-settings";
import { createClient } from "@/lib/supabase/browser";
import {
  type AppearanceColorScheme,
  type AppearanceLocale,
  type AppearanceTheme,
  type AppearanceTimeZone,
  appearanceColorSchemeSchema,
  appearanceLocaleSchema,
  appearanceThemeSchema,
  appearanceTimeZoneSchema,
} from "@/lib/validations/appearance";
import { type MapProviderId, mapProviderSchema, mapSettingsFormSchema } from "@/lib/validations/map-settings";
import type { NotificationPreferences, TrashBinPreference } from "@/lib/validations/settings";

const generateSampleQuery = () => {
  const bbox = "50.0,8.0,51.0,9.0"; // sample bbox
  const [west, south, east, north] = bbox.split(",").map(Number);
  const overpassBbox = `${south},${west},${north},${east}`;

  // Build tag groups from poiCategories
  const tagGroups: Record<string, string[]> = {};

  for (const category of Object.values(poiCategories)) {
    for (const tag of category.tags) {
      if (tag.includes("=")) {
        const parts = tag.split("=");
        if (parts.length === 2) {
          const [key, value] = parts;
          if (key && value) {
            if (!tagGroups[key]) tagGroups[key] = [];
            tagGroups[key].push(value);
          }
        }
      } else {
        // assume amenity
        if (!tagGroups.amenity) tagGroups.amenity = [];
        tagGroups.amenity.push(tag);
      }
    }
  }

  // Create conditions
  const conditions = Object.entries(tagGroups).map(
    ([key, values]) => `["${key}"~"${values.join("|")}"](${overpassBbox})`,
  );

  const query = `
[out:json][timeout:60][maxsize:1Mi];
(
${conditions.map((cond) => `      node${cond};`).join("\n")}
${conditions.map((cond) => `      way${cond};`).join("\n")}
);
out center;
`;

  return query.trim();
};

function ClientSettingsPage() {
  const [selectMounted, setSelectMounted] = useState(false);

  const defaultOverpassEndpoints = useMemo(
    () => [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass.osm.ch/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ],
    [],
  );

  const [openMapSettings, setOpenMapSettings] = useState<{
    overpassEndpoints: string[];
    autoLoadPois: boolean;
    cacheTtlMinutes: OpenmapCacheTtlMinutes;
    maxPoisInMemory: OpenmapMaxPoisMemory;
    aggressiveCaching: boolean;
    lastQuery: string;
  }>({
    overpassEndpoints: defaultOverpassEndpoints,
    autoLoadPois: true,
    cacheTtlMinutes: OPENMAP_DEFAULT_TTL_MINUTES,
    maxPoisInMemory: OPENMAP_DEFAULT_MAX_POIS,
    aggressiveCaching: false,
    lastQuery: "",
  });

  const [brevoSenderName, setBrevoSenderName] = useState("");
  const [brevoSenderEmail, setBrevoSenderEmail] = useState("");

  const [mapProvider, setMapProvider] = useState<MapProviderId>("osm");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [appleMapkitToken, setAppleMapkitToken] = useState("");

  const supabase = createClient();
  const queryClient = useQueryClient();
  const { theme: nextTheme, setTheme } = useTheme();
  const t = useT("settings");
  const format = useFormat();

  useEffect(() => {
    setSelectMounted(true);
  }, []);

  const openmapDbHydratedRef = useRef(false);

  const normalizeCacheTtlMinutes = useCallback((raw: string | null): OpenmapCacheTtlMinutes | null => {
    if (raw === null || raw === "") return null;
    const n = Number.parseInt(raw, 10);
    if (n === 10 || n === 30 || n === 120 || n === 1440) return n;
    return null;
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    const duration = localStorage.getItem("openmap_cacheDuration");
    const endpoints = localStorage.getItem("openmap_overpassEndpoints");
    const autoLoad = localStorage.getItem("openmap_autoLoadPois");

    setOpenMapSettings((prev) => ({
      ...prev,
      overpassEndpoints: endpoints ? JSON.parse(endpoints) : defaultOverpassEndpoints,
      autoLoadPois: autoLoad !== null ? autoLoad === "true" : prev.autoLoadPois,
      cacheTtlMinutes: normalizeCacheTtlMinutes(duration) ?? prev.cacheTtlMinutes,
      lastQuery: "",
    }));
  }, [defaultOverpassEndpoints, normalizeCacheTtlMinutes]);

  const { data: settings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return {};
      const { data, error } = await supabase.from("user_settings").select("key, value").eq("user_id", user.id);
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) {
        map[row.key] = row.value;
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settingsLoading) return;
    if (openmapDbHydratedRef.current) return;
    openmapDbHydratedRef.current = true;

    setOpenMapSettings((prev) => {
      const next = { ...prev };
      const av = settings.openmap_auto_load_pois;
      if (typeof av === "boolean") next.autoLoadPois = av;
      else if (av === "true" || av === 1 || av === "1") next.autoLoadPois = true;
      else if (av === "false" || av === 0 || av === "0") next.autoLoadPois = false;

      const ttl = Number(settings.openmap_cache_ttl_minutes);
      if (ttl === 10 || ttl === 30 || ttl === 120 || ttl === 1440) {
        next.cacheTtlMinutes = ttl;
      }

      const max = Number(settings.openmap_max_pois_memory);
      if (max === 3000 || max === 6000 || max === 12000) {
        next.maxPoisInMemory = max;
      }

      const ag = settings.openmap_aggressive_caching;
      if (typeof ag === "boolean") next.aggressiveCaching = ag;
      else if (ag === "true" || ag === 1 || ag === "1") next.aggressiveCaching = true;
      else if (ag === "false" || ag === 0 || ag === "0") next.aggressiveCaching = false;

      return next;
    });
  }, [settings, settingsLoading]);

  const { data: mapProviderSettings, isLoading: mapProviderLoading } = useQuery({
    queryKey: ["map-provider-settings"],
    queryFn: loadMapSettings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: appearanceRemote, isLoading: appearanceLoading } = useQuery({
    queryKey: ["appearance-settings"],
    queryFn: async () => {
      const loaded = await loadAppearanceSettings();
      return loaded ?? DEFAULT_APPEARANCE;
    },
    staleTime: 5 * 60 * 1000,
  });

  const appearance = appearanceRemote ?? DEFAULT_APPEARANCE;

  useEffect(() => {
    if (mapProviderSettings === undefined) return;
    setMapProvider(mapProviderSettings.map_provider);
    setGoogleMapsApiKey(mapProviderSettings.google_maps_api_key ?? "");
    setAppleMapkitToken(mapProviderSettings.apple_mapkit_token ?? "");
  }, [mapProviderSettings]);

  const { data: notificationPrefs, isLoading: notificationPrefsLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          pushEnabled: NOTIFICATION_DEFAULTS.pushEnabled,
          emailEnabled: NOTIFICATION_DEFAULTS.emailEnabled,
        };
      }
      return fetchNotificationPreferences(supabase, user.id);
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveNotificationMutation = useMutation({
    mutationFn: async (vars: { prefs: NotificationPreferences; changed: "push" | "email" }) => {
      await saveNotificationPreferencesAction(vars.prefs);
      return { changed: vars.changed, prefs: vars.prefs };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences"] });
      const previous = queryClient.getQueryData<NotificationPreferences>(["notification-preferences"]);
      queryClient.setQueryData(["notification-preferences"], vars.prefs);
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["notification-preferences"], context.previous);
      }
      const message = error instanceof Error ? error.message : t("common.unknownError");
      if (message === NOTIFICATION_UI.toastValidationError) {
        toast.error(t("notifications.validationError"));
      } else {
        toast.error(t("notifications.saveErrorTitle"), { description: message });
      }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      const { prefs, changed } = result;
      const successMessage =
        changed === "push"
          ? prefs.pushEnabled
            ? t("notifications.toastPushOn")
            : t("notifications.toastPushOff")
          : prefs.emailEnabled
            ? t("notifications.toastEmailOn")
            : t("notifications.toastEmailOff");
      toast.success(successMessage);
    },
  });

  const savingPush =
    saveNotificationMutation.isPending && saveNotificationMutation.variables?.changed === "push";
  const savingEmail =
    saveNotificationMutation.isPending && saveNotificationMutation.variables?.changed === "email";

  const { data: trashBinPrefs, isLoading: trashPrefsLoading } = useQuery({
    queryKey: ["trash-bin-preference"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { trashBinEnabled: TRASH_BIN_DEFAULT_ENABLED };
      }
      return fetchTrashBinPreference(supabase, user.id);
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveTrashBinMutation = useMutation({
    mutationFn: async (prefs: TrashBinPreference) => {
      await saveTrashBinPreferenceAction(prefs);
      return prefs;
    },
    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: ["trash-bin-preference"] });
      const previous = queryClient.getQueryData<TrashBinPreference>(["trash-bin-preference"]);
      queryClient.setQueryData(["trash-bin-preference"], prefs);
      return { previous };
    },
    onError: (error, _prefs, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["trash-bin-preference"], context.previous);
      }
      const message = error instanceof Error ? error.message : t("common.unknownError");
      if (message === TRASH_BIN_UI.toastValidationError) {
        toast.error(t("trashBin.validationError"));
      } else {
        toast.error(t("trashBin.saveError"), { description: message });
      }
    },
    onSuccess: (prefs) => {
      void queryClient.invalidateQueries({ queryKey: ["trash-bin-preference"] });
      toast.success(prefs.trashBinEnabled ? t("trashBin.toastOn") : t("trashBin.toastOff"));
    },
  });

  const savingTrashBin = saveTrashBinMutation.isPending;

  const appearanceThemeMutation = useMutation({
    mutationFn: async (next: AppearanceTheme) => {
      await saveAppearanceTheme(next);
    },
    onSuccess: async (_data, next) => {
      setTheme(next);
      await queryClient.invalidateQueries({ queryKey: ["appearance-settings"] });
      toast.success(t("appearance.themeSaved"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      toast.error(t("appearance.themeSaveErrorTitle"), { description: message });
    },
  });

  const appearanceLocaleMutation = useMutation({
    mutationFn: async (locale: AppearanceLocale) => {
      await saveAppearanceLocale(locale);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appearance-settings"] });
      toast.success(
        t.rich("appearance.localeSavedRich", {
          b: (chunks) => <strong>{chunks}</strong>,
        }),
      );
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      toast.error(t("appearance.localeSaveErrorTitle"), { description: message });
    },
  });

  const appearanceColorMutation = useMutation({
    mutationFn: async (colorScheme: AppearanceColorScheme) => {
      await saveAppearanceColorScheme(colorScheme);
    },
    onSuccess: async (_data, colorScheme) => {
      const isDark =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      applyAppearanceColorTokens(colorScheme, isDark);
      await queryClient.invalidateQueries({ queryKey: ["appearance-settings"] });
      toast.success(t("appearance.colorSaved"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      toast.error(t("appearance.colorSaveErrorTitle"), { description: message });
    },
  });

  const appearanceTimezoneMutation = useMutation({
    mutationFn: async (next: AppearanceTimeZone) => {
      await saveAppearanceTimeZone(next);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appearance-settings"] });
      toast.success(t("appearance.timezoneSaved"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      toast.error(t("appearance.timezoneSaveErrorTitle"), { description: message });
    },
  });

  const { data: brevoSenderSettings } = useQuery({
    queryKey: ["brevo-sender-settings"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { name: "", email: "" };
      const { data, error } = await supabase
        .from("user_settings")
        .select("key, value")
        .eq("user_id", user.id)
        .in("key", ["brevo_sender_name", "brevo_sender_email"]);
      if (error) throw error;
      let name = "";
      let email = "";
      for (const row of data ?? []) {
        if (row.key === "brevo_sender_name" && typeof row.value === "string") name = row.value;
        if (row.key === "brevo_sender_email" && typeof row.value === "string") email = row.value;
      }
      return { name, email };
    },
    staleTime: 5 * 60 * 1000,
  });

  const mapSettingsMutation = useMutation({
    mutationFn: async () => {
      const parsed = mapSettingsFormSchema.safeParse({
        map_provider: mapProvider,
        google_maps_api_key: googleMapsApiKey,
        apple_mapkit_token: appleMapkitToken,
      });
      if (!parsed.success) {
        const errs = parsed.error.flatten().fieldErrors;
        const first = errs.map_provider?.[0] ?? errs.google_maps_api_key?.[0] ?? errs.apple_mapkit_token?.[0];
        throw new Error(first ?? t("common.invalidInput"));
      }
      await saveMapSettings({
        map_provider: parsed.data.map_provider,
        google_maps_api_key: parsed.data.google_maps_api_key ?? null,
        apple_mapkit_token: parsed.data.apple_mapkit_token ?? null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["map-provider-settings"] });
      toast.success(t("map.savedToast"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      toast.error(t("map.saveErrorTitle"), { description: message });
    },
  });

  const brevoSenderMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t("brevo.notSignedIn"));
      const rows = [
        { user_id: user.id, key: "brevo_sender_name", value: payload.name.trim() },
        { user_id: user.id, key: "brevo_sender_email", value: payload.email.trim() },
      ];
      for (const row of rows) {
        const { error } = await supabase.from("user_settings").upsert(row, { onConflict: "user_id,key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brevo-sender-settings"] });
      toast.success(t("brevo.savedToast"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      if (message === t("brevo.notSignedIn")) {
        toast.error(t("brevo.notSignedIn"));
        return;
      }
      toast.error(t("brevo.saveErrorTitle"), { description: message });
    },
  });

  const openMapMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t("brevo.notSignedIn"));

      const rows = [
        { user_id: user.id, key: "openmap_auto_load_pois", value: openMapSettings.autoLoadPois },
        { user_id: user.id, key: "openmap_cache_ttl_minutes", value: openMapSettings.cacheTtlMinutes },
        { user_id: user.id, key: "openmap_max_pois_memory", value: openMapSettings.maxPoisInMemory },
        { user_id: user.id, key: "openmap_aggressive_caching", value: openMapSettings.aggressiveCaching },
      ];
      for (const row of rows) {
        const { error } = await supabase.from("user_settings").upsert(row, { onConflict: "user_id,key" });
        if (error) throw error;
      }

      localStorage.setItem("openmap_overpassEndpoints", JSON.stringify(openMapSettings.overpassEndpoints));
      localStorage.setItem("openmap_autoLoadPois", openMapSettings.autoLoadPois.toString());
      localStorage.setItem("openmap_cacheDuration", openMapSettings.cacheTtlMinutes.toString());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["openmap-user-preferences"] });
      loadFromLocalStorage();
      window.dispatchEvent(new CustomEvent("openmap-settings-changed"));
      toast.success(t("openMap.savedToast"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      if (message === t("brevo.notSignedIn")) {
        toast.error(t("brevo.notSignedIn"));
        return;
      }
      toast.error(t("openMap.saveErrorTitle"), { description: message });
    },
  });

  const testOverpassMutation = useMutation({
    mutationFn: async () => {
      const query = generateSampleQuery();
      const endpoint = openMapSettings.overpassEndpoints[0];
      if (!endpoint) throw new Error(t("openMap.errorNoEndpoint"));
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) throw new Error(t("openMap.errorTestFailed"));
      return response.json();
    },
    onSuccess: () => {
      toast.success(t("openMap.testSuccess"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      toast.error(t("openMap.testErrorTitle"), { description: message });
    },
  });

  // Fixed tagGroups building - safe indexing
  const _tagGroups: Record<string, string[]> = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(settings)) {
      const groupKey = key.split("_")[0];
      if (groupKey) {
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(String(value));
      }
    }
    return groups;
  }, [settings]);

  const clearCache = () => {
    localStorage.removeItem("openmap-poi-cache");
    if (confirm(t("openMap.confirmClear"))) {
      window.location.reload();
    }
  };

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    if (brevoSenderSettings) {
      setBrevoSenderName(brevoSenderSettings.name);
      setBrevoSenderEmail(brevoSenderSettings.email);
    }
  }, [brevoSenderSettings]);

  const isLoading =
    settingsLoading ||
    notificationPrefsLoading ||
    trashPrefsLoading ||
    mapProviderLoading ||
    appearanceLoading;

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Notifications Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              {t("notifications.cardTitle")}
            </CardTitle>
            <CardDescription>{t("notifications.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent
            className={`space-y-6 ${notificationPrefsLoading ? "animate-pulse" : ""}`}
            aria-busy={notificationPrefsLoading || saveNotificationMutation.isPending}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="notifications-push" className="text-sm font-medium">
                  {t("notifications.pushLabel")}
                </Label>
                <p className="text-muted-foreground text-xs leading-relaxed">{t("notifications.pushHelp")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  id="notifications-push"
                  className="shrink-0"
                  checked={(notificationPrefs ?? NOTIFICATION_DEFAULTS).pushEnabled}
                  disabled={notificationPrefsLoading || savingPush}
                  onCheckedChange={(checked) => {
                    const base = notificationPrefs ?? NOTIFICATION_DEFAULTS;
                    saveNotificationMutation.mutate({
                      prefs: { pushEnabled: checked, emailEnabled: base.emailEnabled },
                      changed: "push",
                    });
                  }}
                />
                {savingPush ? (
                  <>
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-muted-foreground text-xs tabular-nums">{t("notifications.saving")}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="notifications-email" className="text-sm font-medium">
                  {t("notifications.emailLabel")}
                </Label>
                <p className="text-muted-foreground text-xs leading-relaxed">{t("notifications.emailHelp")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  id="notifications-email"
                  className="shrink-0"
                  checked={(notificationPrefs ?? NOTIFICATION_DEFAULTS).emailEnabled}
                  disabled={notificationPrefsLoading || savingEmail}
                  onCheckedChange={(checked) => {
                    const base = notificationPrefs ?? NOTIFICATION_DEFAULTS;
                    saveNotificationMutation.mutate({
                      prefs: { pushEnabled: base.pushEnabled, emailEnabled: checked },
                      changed: "email",
                    });
                  }}
                />
                {savingEmail ? (
                  <>
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-muted-foreground text-xs tabular-nums">{t("notifications.saving")}</span>
                  </>
                ) : null}
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t("notifications.activeChannels", {
                count:
                  ((notificationPrefs ?? NOTIFICATION_DEFAULTS).pushEnabled ? 1 : 0) +
                  ((notificationPrefs ?? NOTIFICATION_DEFAULTS).emailEnabled ? 1 : 0),
              })}
            </p>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              {t("appearance.title")}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t("appearance.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-xs">
              {t("appearance.datePreview", {
                date: format.dateTime(new Date(), { dateStyle: "medium" }),
              })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="appearance-theme">{t("appearance.themeLabel")}</Label>
              <Select
                value={selectMounted && nextTheme ? nextTheme : undefined}
                onValueChange={(value) => {
                  const parsed = appearanceThemeSchema.safeParse(value);
                  if (parsed.success) appearanceThemeMutation.mutate(parsed.data);
                }}
                disabled={appearanceThemeMutation.isPending}
              >
                <SelectTrigger id="appearance-theme" className="w-full max-w-md">
                  <SelectValue placeholder={selectMounted ? undefined : t("common.ellipsis")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("appearance.themeLight")}</SelectItem>
                  <SelectItem value="dark">{t("appearance.themeDark")}</SelectItem>
                  <SelectItem value="system">{t("appearance.themeSystem")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appearance-language">{t("appearance.languageLabel")}</Label>
              <Select
                value={appearance.locale}
                onValueChange={(value) => {
                  const parsed = appearanceLocaleSchema.safeParse(value);
                  if (parsed.success) appearanceLocaleMutation.mutate(parsed.data);
                }}
                disabled={appearanceLocaleMutation.isPending}
              >
                <SelectTrigger id="appearance-language" className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("appearance.localeOptionEnglish")}</SelectItem>
                  <SelectItem value="de">{t("appearance.localeOptionGerman")}</SelectItem>
                  <SelectItem value="hr">{t("appearance.localeOptionCroatian")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appearance-timezone">{t("appearance.timezoneLabel")}</Label>
              <AppearanceTimezoneSelect
                id="appearance-timezone"
                value={appearance.timeZone}
                disabled={appearanceTimezoneMutation.isPending}
                onValueChange={(tz) => {
                  const parsed = appearanceTimeZoneSchema.safeParse(tz);
                  if (parsed.success) appearanceTimezoneMutation.mutate(parsed.data);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appearance-color">{t("appearance.colorLabel")}</Label>
              <Select
                value={appearance.colorScheme}
                onValueChange={(value) => {
                  const parsed = appearanceColorSchemeSchema.safeParse(value);
                  if (parsed.success) appearanceColorMutation.mutate(parsed.data);
                }}
                disabled={appearanceColorMutation.isPending}
              >
                <SelectTrigger id="appearance-color" className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPEARANCE_COLOR_SCHEME_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: APPEARANCE_COLOR_SWATCH[id] }}
                          aria-hidden
                        />
                        {t(`appearance.colors.${id}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trash bin preference */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArchiveRestore className="mr-2 h-5 w-5" />
              {t("trashBin.cardTitle")}
            </CardTitle>
            <CardDescription>{t("trashBin.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent
            className={`space-y-4 ${trashPrefsLoading ? "animate-pulse" : ""}`}
            aria-busy={trashPrefsLoading || savingTrashBin}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="settings-trash-bin" className="text-sm font-medium">
                  {t("trashBin.label")}
                </Label>
                <p className="text-muted-foreground text-xs leading-relaxed">{t("trashBin.help")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  id="settings-trash-bin"
                  className="shrink-0"
                  checked={(trashBinPrefs ?? { trashBinEnabled: TRASH_BIN_DEFAULT_ENABLED }).trashBinEnabled}
                  disabled={trashPrefsLoading || savingTrashBin}
                  onCheckedChange={(checked) => {
                    saveTrashBinMutation.mutate({ trashBinEnabled: checked });
                  }}
                />
                {savingTrashBin ? (
                  <>
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-muted-foreground text-xs tabular-nums">{t("trashBin.saving")}</span>
                  </>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map provider (OpenMap basemap) */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="flex items-center text-lg">
              <Layers className="mr-2 h-5 w-5 shrink-0" />
              {t("map.title")}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t.rich("map.descriptionRich", {
                em: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="map-provider-select">
                {t("map.basemapLabel")}
              </Label>
              <Select
                value={mapProvider}
                onValueChange={(v) => {
                  const parsed = mapProviderSchema.safeParse(v);
                  if (parsed.success) setMapProvider(parsed.data);
                }}
              >
                <SelectTrigger id="map-provider-select" className="w-full max-w-md">
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="osm">{t("map.providerOsm")}</SelectItem>
                  <SelectItem value="google">{t("map.providerGoogle")}</SelectItem>
                  <SelectItem value="apple">{t("map.providerApple")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="map-google-api-key">
                {t("map.googleKeyLabel")}
              </Label>
              <p className="text-muted-foreground text-xs leading-snug">{t("map.googleKeyHelp")}</p>
              <Input
                id="map-google-api-key"
                className="max-w-md"
                type="password"
                autoComplete="off"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                placeholder={t("map.googleKeyPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="map-apple-mapkit-token">
                {t("map.appleTokenLabel")}
              </Label>
              <p className="text-muted-foreground text-xs leading-snug">{t("map.appleTokenHelp")}</p>
              <Input
                id="map-apple-mapkit-token"
                className="max-w-md"
                type="password"
                autoComplete="off"
                value={appleMapkitToken}
                onChange={(e) => setAppleMapkitToken(e.target.value)}
                placeholder={t("map.appleTokenPlaceholder")}
              />
            </div>
            <div className="pt-1">
              <Button
                type="button"
                onClick={() => mapSettingsMutation.mutate()}
                disabled={mapSettingsMutation.isPending}
              >
                {mapSettingsMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* OpenMap Settings Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              {t("openMap.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("openMap.overpassLabel")}</Label>
              <Textarea
                value={openMapSettings.overpassEndpoints.join("\n")}
                onChange={(e) =>
                  setOpenMapSettings((prev) => ({
                    ...prev,
                    overpassEndpoints: e.target.value.split("\n").filter(Boolean),
                  }))
                }
                placeholder={t("openMap.overpassPlaceholder")}
                rows={4}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="autoLoadPois" className="text-sm font-medium">
                  {t("openMap.autoLoadLabel")}
                </Label>
                <p className="text-muted-foreground text-xs leading-relaxed">{t("openMap.autoLoadHelp")}</p>
              </div>
              <Switch
                id="autoLoadPois"
                className="shrink-0"
                checked={openMapSettings.autoLoadPois}
                onCheckedChange={(checked) => setOpenMapSettings((prev) => ({ ...prev, autoLoadPois: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openmap-cache-ttl" className="text-sm font-medium">
                {t("openMap.cacheValidityLabel")}
              </Label>
              <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p>{t("openMap.cacheValidityWhat")}</p>
                <p>{t("openMap.cacheValidityTradeoff")}</p>
                <p>{t("openMap.cacheValidityRecommend")}</p>
              </div>
              {selectMounted ? (
                <Select
                  value={String(openMapSettings.cacheTtlMinutes)}
                  onValueChange={(v) => {
                    const n = Number.parseInt(v, 10) as OpenmapCacheTtlMinutes;
                    if (n === 10 || n === 30 || n === 120 || n === 1440) {
                      setOpenMapSettings((prev) => ({ ...prev, cacheTtlMinutes: n }));
                    }
                  }}
                >
                  <SelectTrigger id="openmap-cache-ttl" className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">{t("openMap.cacheTtl10m")}</SelectItem>
                    <SelectItem value="30">{t("openMap.cacheTtl30m")}</SelectItem>
                    <SelectItem value="120">{t("openMap.cacheTtl2h")}</SelectItem>
                    <SelectItem value="1440">{t("openMap.cacheTtl24h")}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 max-w-xs items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
                  {t("common.ellipsis")}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="openmap-max-pois">{t("openMap.maxPoisLabel")}</Label>
              <p className="text-muted-foreground text-xs leading-relaxed">{t("openMap.maxPoisHelp")}</p>
              {selectMounted ? (
                <Select
                  value={String(openMapSettings.maxPoisInMemory)}
                  onValueChange={(v) => {
                    const n = Number.parseInt(v, 10) as OpenmapMaxPoisMemory;
                    if (n === 3000 || n === 6000 || n === 12000) {
                      setOpenMapSettings((prev) => ({ ...prev, maxPoisInMemory: n }));
                    }
                  }}
                >
                  <SelectTrigger id="openmap-max-pois" className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3000">3000</SelectItem>
                    <SelectItem value="6000">6000</SelectItem>
                    <SelectItem value="12000">12000</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 max-w-xs items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
                  {t("common.ellipsis")}
                </div>
              )}
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="openmap-aggressive" className="text-sm font-medium">
                  {t("openMap.aggressiveCachingLabel")}
                </Label>
                <p className="text-muted-foreground text-xs leading-relaxed">{t("openMap.aggressiveCachingHelp")}</p>
              </div>
              <Switch
                id="openmap-aggressive"
                className="shrink-0"
                checked={openMapSettings.aggressiveCaching}
                onCheckedChange={(checked) =>
                  setOpenMapSettings((prev) => ({ ...prev, aggressiveCaching: checked }))
                }
              />
            </div>
            <div className="border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={clearCache}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("openMap.clearCache")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>{t("openMap.sampleQueryLabel")}</Label>
              <Textarea value={generateSampleQuery()} readOnly rows={10} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => openMapMutation.mutate()} disabled={openMapMutation.isPending}>
                {openMapMutation.isPending ? t("common.saving") : t("openMap.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => testOverpassMutation.mutate()}
                disabled={testOverpassMutation.isPending}
              >
                {testOverpassMutation.isPending ? t("openMap.testing") : t("openMap.test")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Brevo Settings */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              {t("brevo.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t.rich("brevo.introRich", {
                name: () => <span className="font-mono text-foreground">BREVO_SENDER_NAME</span>,
                email: () => <span className="font-mono text-foreground">BREVO_SENDER_EMAIL</span>,
              })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="brevo-sender-name">{t("brevo.senderName")}</Label>
              <Input
                id="brevo-sender-name"
                value={brevoSenderName}
                onChange={(e) => setBrevoSenderName(e.target.value)}
                placeholder={t("brevo.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brevo-sender-email">{t("brevo.senderEmail")}</Label>
              <Input
                id="brevo-sender-email"
                type="email"
                value={brevoSenderEmail}
                onChange={(e) => setBrevoSenderEmail(e.target.value)}
                placeholder={t("brevo.emailPlaceholder")}
              />
            </div>
            <Button
              type="button"
              onClick={() => brevoSenderMutation.mutate({ name: brevoSenderName, email: brevoSenderEmail })}
              disabled={brevoSenderMutation.isPending}
            >
              {brevoSenderMutation.isPending ? t("common.saving") : t("brevo.save")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t.rich("brevo.footerRich", {
                campaign: (chunks) => (
                  <Link href="/brevo" className="font-medium text-primary underline-offset-4 hover:underline">
                    {chunks}
                  </Link>
                ),
                sync: (chunks) => (
                  <Link href="/brevo/sync" className="font-medium text-primary underline-offset-4 hover:underline">
                    {chunks}
                  </Link>
                ),
                key: (chunks) => <span className="font-mono text-foreground">{chunks}</span>,
                env: (chunks) => <span className="font-mono text-foreground">{chunks}</span>,
                prefix: (chunks) => <span className="font-mono">{chunks}</span>,
              })}
            </p>
            </CardContent>
        </Card>
        
        {/* SMTP Settings */}
        <div className="md:col-span-2">
          <SmtpSettings />
        </div>
      </div>
    </div>
  );
}

export default ClientSettingsPage;
