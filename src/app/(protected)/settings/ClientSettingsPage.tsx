// src/app/(protected)/settings/ClientSettingsPage.tsx
// This file defines the ClientSettingsPage component, which is the main settings page for the application. It includes sections for notifications, appearance, OpenMap settings, and SMTP email settings. Users can configure their preferences and save them, with changes being persisted to the database and local storage as needed.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Layers, Mail, MapPin, Palette, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SmtpSettings from "@/components/email/SmtpSettings";
import {
  appearanceResolvedIsDark,
  applyAppearanceColorTokens,
  persistAppearanceLocalMirror,
} from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { poiCategories } from "@/lib/constants/map-poi-config";
import {
  APPEARANCE_COLOR_LABELS,
  APPEARANCE_COLOR_SCHEME_IDS,
  APPEARANCE_COLOR_SWATCH,
} from "@/lib/constants/theme";
import { loadMapSettings, saveMapSettings } from "@/lib/services/map-settings";
import {
  DEFAULT_APPEARANCE,
  loadAppearanceSettings,
  saveAppearanceColorScheme,
  saveAppearanceLocale,
  saveAppearanceTheme,
} from "@/lib/services/user-settings";
import { createClient } from "@/lib/supabase/browser";
import { safeDisplay } from "@/lib/utils/data-format";
import {
  type MapProviderId,
  mapProviderSchema,
  mapSettingsFormSchema,
} from "@/lib/validations/map-settings";
import {
  type AppearanceSettingsRecord,
  appearanceColorSchemeSchema,
  appearanceLocaleSchema,
  appearanceThemeSchema,
} from "@/lib/validations/settings";

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

type ClientSettingsPageProps = {
  displayName: string | null;
};

function ClientSettingsPage({ displayName }: ClientSettingsPageProps) {
  const { theme: nextTheme, setTheme, resolvedTheme } = useTheme();
  const [selectMounted, setSelectMounted] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const defaultOverpassEndpoints = useMemo(
    () => [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass.osm.ch/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ],
    [],
  );

  const [openMapSettings, setOpenMapSettings] = useState({
    overpassEndpoints: defaultOverpassEndpoints,
    autoLoadPois: true,
    cacheDuration: 10,
    maxCacheSize: 30,
    lastQuery: "",
  });

  const [brevoSenderName, setBrevoSenderName] = useState("");
  const [brevoSenderEmail, setBrevoSenderEmail] = useState("");

  const [mapProvider, setMapProvider] = useState<MapProviderId>("osm");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [appleMapkitToken, setAppleMapkitToken] = useState("");

  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSelectMounted(true);
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    const maxSize = localStorage.getItem("openmap_maxCacheSize");
    const duration = localStorage.getItem("openmap_cacheDuration");
    const endpoints = localStorage.getItem("openmap_overpassEndpoints");
    const autoLoad = localStorage.getItem("openmap_autoLoadPois");

    setOpenMapSettings({
      overpassEndpoints: endpoints ? JSON.parse(endpoints) : defaultOverpassEndpoints,
      autoLoadPois: autoLoad !== null ? autoLoad === "true" : true,
      cacheDuration: duration ? parseInt(duration, 10) : 10,
      maxCacheSize: maxSize ? parseInt(maxSize, 10) : 30,
      lastQuery: "",
    });
  }, [defaultOverpassEndpoints]);

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

  const { data: appearance = DEFAULT_APPEARANCE, isLoading: appearanceLoading } = useQuery({
    queryKey: ["appearance-settings"],
    queryFn: async () => {
      const loaded = await loadAppearanceSettings();
      return loaded ?? DEFAULT_APPEARANCE;
    },
    staleTime: 5 * 60 * 1000,
  });

  const appearanceThemeMutation = useMutation({
    mutationFn: saveAppearanceTheme,
    onSuccess: (_, theme) => {
      setTheme(theme);
      queryClient.setQueryData(["appearance-settings"], (prev: AppearanceSettingsRecord | undefined) => {
        const next: AppearanceSettingsRecord = { ...(prev ?? DEFAULT_APPEARANCE), theme };
        persistAppearanceLocalMirror(next);
        return next;
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Theme konnte nicht gespeichert werden", { description: message });
    },
  });

  const appearanceLocaleMutation = useMutation({
    mutationFn: saveAppearanceLocale,
    onSuccess: (_, locale) => {
      queryClient.setQueryData(["appearance-settings"], (prev: AppearanceSettingsRecord | undefined) => {
        const next: AppearanceSettingsRecord = { ...(prev ?? DEFAULT_APPEARANCE), locale };
        persistAppearanceLocalMirror(next);
        document.documentElement.lang = locale;
        return next;
      });
      toast.success(locale === "de" ? "Sprache geändert" : "Language changed");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Sprache konnte nicht gespeichert werden", { description: message });
    },
  });

  const appearanceColorMutation = useMutation({
    mutationFn: saveAppearanceColorScheme,
    onSuccess: (_, colorScheme) => {
      queryClient.setQueryData(["appearance-settings"], (prev: AppearanceSettingsRecord | undefined) => {
        const next: AppearanceSettingsRecord = { ...(prev ?? DEFAULT_APPEARANCE), colorScheme };
        persistAppearanceLocalMirror(next);
        applyAppearanceColorTokens(colorScheme, appearanceResolvedIsDark(resolvedTheme));
        return next;
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Farbschema konnte nicht gespeichert werden", { description: message });
    },
  });

  const { data: mapProviderSettings } = useQuery({
    queryKey: ["map-provider-settings"],
    queryFn: loadMapSettings,
    staleTime: 5 * 60 * 1000,
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
        throw new Error(first ?? "Ungültige Eingabe");
      }
      await saveMapSettings({
        map_provider: parsed.data.map_provider,
        google_maps_api_key: parsed.data.google_maps_api_key ?? null,
        apple_mapkit_token: parsed.data.apple_mapkit_token ?? null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["map-provider-settings"] });
      toast.success("Karten-Einstellungen gespeichert");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Karten-Einstellungen konnten nicht gespeichert werden", { description: message });
    },
  });

  const brevoSenderMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
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
      toast.success("Brevo-Absender gespeichert");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Brevo-Einstellungen konnten nicht gespeichert werden", { description: message });
    },
  });

  const openMapMutation = useMutation({
    mutationFn: async () => {
      localStorage.setItem("openmap_maxCacheSize", openMapSettings.maxCacheSize.toString());
      localStorage.setItem("openmap_cacheDuration", openMapSettings.cacheDuration.toString());
      localStorage.setItem("openmap_overpassEndpoints", JSON.stringify(openMapSettings.overpassEndpoints));
      localStorage.setItem("openmap_autoLoadPois", openMapSettings.autoLoadPois.toString());
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      loadFromLocalStorage();
      window.dispatchEvent(new CustomEvent("openmap-settings-changed"));
      toast.success("OpenMap settings saved successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to save OpenMap settings", { description: message });
    },
  });

  const testOverpassMutation = useMutation({
    mutationFn: async () => {
      const query = generateSampleQuery();
      const endpoint = openMapSettings.overpassEndpoints[0];
      if (!endpoint) throw new Error("No Overpass endpoint configured");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) throw new Error("Overpass test failed");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Overpass test successful");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Overpass test failed", { description: message });
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
    if (confirm("Clear POI cache and reload the page to apply changes?")) {
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

  useEffect(() => {
    if (!mapProviderSettings) return;
    setMapProvider(mapProviderSettings.map_provider);
    setGoogleMapsApiKey(mapProviderSettings.google_maps_api_key ?? "");
    setAppleMapkitToken(mapProviderSettings.apple_mapkit_token ?? "");
  }, [mapProviderSettings]);

  const pageLoading = settingsLoading || appearanceLoading;

  if (pageLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Settings</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">Verwalte deine Account- und CRM-Einstellungen</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Notifications Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="text-sm font-medium">
                Push Notifications
              </Label>
              <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailAlerts" className="text-sm font-medium">
                Email Alerts
              </Label>
              <Switch id="emailAlerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <p className="text-muted-foreground text-sm">Configure how you receive notifications</p>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Wähle Hell-, Dunkel- oder Systemmodus (next-themes), die Oberflächensprache für{" "}
              <span className="font-mono text-foreground">{"<html lang>"}</span>, und ein Farbschema für Primär-
              und Akzentfarben (CSS-Variablen). Einstellungen werden im Konto gespeichert und lokal
              gespiegelt. Das hier gespeicherte Theme ist die Voreinstellung beim nächsten App-Start;
              in der laufenden Sitzung kannst du unabhängig davon in der Kopfzeile zwischen Hell und
              Dunkel wechseln (ohne die gespeicherte Voreinstellung zu ändern).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appearance-theme">Theme</Label>
              <Select
                value={selectMounted && nextTheme ? nextTheme : undefined}
                onValueChange={(value) => {
                  const parsed = appearanceThemeSchema.safeParse(value);
                  if (parsed.success) appearanceThemeMutation.mutate(parsed.data);
                }}
                disabled={appearanceThemeMutation.isPending}
              >
                <SelectTrigger id="appearance-theme" className="w-full max-w-md">
                  <SelectValue placeholder={selectMounted ? undefined : "…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appearance-language">Language</Label>
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
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appearance-color">Color theme</Label>
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
                        {APPEARANCE_COLOR_LABELS[id]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-sm">
              Vollständige Übersetzung der App-Inhalte kann später per i18n ergänzt werden; die Auswahl ist
              bereits persistent.
            </p>
          </CardContent>
        </Card>

        {/* Map provider (OpenMap basemap) */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="flex items-center text-lg">
              <Layers className="mr-2 h-5 w-5 shrink-0" />
              OpenMap — Karten-Anbieter
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Voreinstellung:{" "}
              <span className="font-medium text-foreground">OpenStreetMap (CARTO)</span> — unverändert zur bisherigen
              Karte (Tiles, Attribution, Verhalten). Google und Apple sind optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="map-provider-select">
                Basiskarte
              </Label>
              <Select
                value={mapProvider}
                onValueChange={(v) => {
                  const parsed = mapProviderSchema.safeParse(v);
                  if (parsed.success) setMapProvider(parsed.data);
                }}
              >
                <SelectTrigger id="map-provider-select" className="w-full max-w-md">
                  <SelectValue placeholder="Anbieter wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="osm">OpenStreetMap (CARTO) — Standard</SelectItem>
                  <SelectItem value="google">Google Maps (Map Tiles API)</SelectItem>
                  <SelectItem value="apple">Apple Maps (Basiskarte wie OSM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="map-google-api-key">
                Google API-Schlüssel
              </Label>
              <p className="text-muted-foreground text-xs leading-snug">
                Nur für Google-Basiskarte. Map Tiles API aktivieren und Abrechnung im Google-Cloud-Projekt erlauben.
              </p>
              <Input
                id="map-google-api-key"
                className="max-w-md"
                type="password"
                autoComplete="off"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                placeholder="Leer lassen, wenn ungenutzt"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="map-apple-mapkit-token">
                Apple MapKit JWT
              </Label>
              <p className="text-muted-foreground text-xs leading-snug">
                Optional für künftiges MapKit. Bis dahin: gleiche OSM/CARTO-Basiskarte wie beim Standard.
              </p>
              <Input
                id="map-apple-mapkit-token"
                className="max-w-md"
                type="password"
                autoComplete="off"
                value={appleMapkitToken}
                onChange={(e) => setAppleMapkitToken(e.target.value)}
                placeholder="Leer lassen, wenn ungenutzt"
              />
            </div>
            <div className="pt-1">
              <Button
                type="button"
                onClick={() => mapSettingsMutation.mutate()}
                disabled={mapSettingsMutation.isPending}
              >
                {mapSettingsMutation.isPending ? "Speichern…" : "Speichern"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* OpenMap Settings Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              OpenMap Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Overpass Endpoints</Label>
              <Textarea
                value={openMapSettings.overpassEndpoints.join("\n")}
                onChange={(e) =>
                  setOpenMapSettings((prev) => ({
                    ...prev,
                    overpassEndpoints: e.target.value.split("\n").filter(Boolean),
                  }))
                }
                placeholder="One endpoint per line"
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoLoadPois" className="text-sm font-medium">
                Auto Load POIs
              </Label>
              <Switch
                id="autoLoadPois"
                checked={openMapSettings.autoLoadPois}
                onCheckedChange={(checked) => setOpenMapSettings((prev) => ({ ...prev, autoLoadPois: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cache Duration (minutes)</Label>
              <Input
                type="number"
                value={openMapSettings.cacheDuration}
                onChange={(e) =>
                  setOpenMapSettings((prev) => ({ ...prev, cacheDuration: parseInt(e.target.value, 10) || 10 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max Cache Size (MB)</Label>
              <Input
                type="number"
                value={openMapSettings.maxCacheSize}
                onChange={(e) =>
                  setOpenMapSettings((prev) => ({ ...prev, maxCacheSize: parseInt(e.target.value, 10) || 30 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Sample Overpass Query</Label>
              <Textarea value={generateSampleQuery()} readOnly rows={10} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openMapMutation.mutate()} disabled={openMapMutation.isPending}>
                {openMapMutation.isPending ? "Saving..." : "Save OpenMap Settings"}
              </Button>
              <Button variant="outline" onClick={clearCache}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear POI Cache
              </Button>
              <Button
                variant="outline"
                onClick={() => testOverpassMutation.mutate()}
                disabled={testOverpassMutation.isPending}
              >
                {testOverpassMutation.isPending ? "Testing..." : "Test Overpass"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Brevo Settings */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Brevo Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Absender für Brevo-Kampagnen. Leer lassen, um{" "}
              <span className="font-mono text-foreground">BREVO_SENDER_NAME</span> /{" "}
              <span className="font-mono text-foreground">BREVO_SENDER_EMAIL</span> aus der Umgebung zu nutzen.
            </p>
            <div className="space-y-2">
              <Label htmlFor="brevo-sender-name">Sender Name</Label>
              <Input
                id="brevo-sender-name"
                value={brevoSenderName}
                onChange={(e) => setBrevoSenderName(e.target.value)}
                placeholder="z. B. AquaDock CRM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brevo-sender-email">Sender Email</Label>
              <Input
                id="brevo-sender-email"
                type="email"
                value={brevoSenderEmail}
                onChange={(e) => setBrevoSenderEmail(e.target.value)}
                placeholder="noreply@example.com"
              />
            </div>
            <Button
              type="button"
              onClick={() => brevoSenderMutation.mutate({ name: brevoSenderName, email: brevoSenderEmail })}
              disabled={brevoSenderMutation.isPending}
            >
              {brevoSenderMutation.isPending ? "Speichern…" : "Brevo-Absender speichern"}
            </Button>
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
