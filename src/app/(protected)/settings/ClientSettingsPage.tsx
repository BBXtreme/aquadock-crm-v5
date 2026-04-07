// src/app/(protected)/settings/ClientSettingsPage.tsx
// This file defines the ClientSettingsPage component, which is the main settings page for the application. It includes sections for notifications, appearance, OpenMap settings, and SMTP email settings. Users can configure their preferences and save them, with changes being persisted to the database and local storage as needed.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2, Mail, MapPin, Palette, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SmtpSettings from "@/components/email/SmtpSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPageSkeleton } from "@/components/ui/page-list-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveNotificationPreferencesAction } from "@/lib/actions/notifications";
import { poiCategories } from "@/lib/constants/map-poi-config";
import {
  getNotificationPreferenceSuccessToast,
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_UI,
} from "@/lib/constants/notifications";
import { fetchNotificationPreferences } from "@/lib/services/user-settings";
import { createClient } from "@/lib/supabase/browser";
import type { NotificationPreferences } from "@/lib/validations/settings";

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
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");

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

  const supabase = createClient();
  const queryClient = useQueryClient();

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

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_settings").select("*").single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "not found"
      return data || {};
    },
    staleTime: 5 * 60 * 1000,
  });

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
      const message = error instanceof Error ? error.message : NOTIFICATION_UI.unknownError;
      if (message === NOTIFICATION_UI.toastValidationError) {
        toast.error(NOTIFICATION_UI.toastValidationError);
      } else {
        toast.error(NOTIFICATION_UI.toastSaveErrorTitle, { description: message });
      }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success(getNotificationPreferenceSuccessToast(result.changed, result.prefs));
    },
  });

  const savingPush =
    saveNotificationMutation.isPending && saveNotificationMutation.variables?.changed === "push";
  const savingEmail =
    saveNotificationMutation.isPending && saveNotificationMutation.variables?.changed === "email";

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
              {NOTIFICATION_UI.cardTitle}
            </CardTitle>
            <CardDescription>{NOTIFICATION_UI.cardDescription}</CardDescription>
          </CardHeader>
          <CardContent
            className={`space-y-6 ${notificationPrefsLoading ? "animate-pulse" : ""}`}
            aria-busy={notificationPrefsLoading || saveNotificationMutation.isPending}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="notifications-push" className="text-sm font-medium">
                  {NOTIFICATION_UI.pushLabel}
                </Label>
                <p className="text-muted-foreground text-xs leading-relaxed">{NOTIFICATION_UI.pushHelp}</p>
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
                    <span className="text-muted-foreground text-xs tabular-nums">{NOTIFICATION_UI.saving}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="notifications-email" className="text-sm font-medium">
                  {NOTIFICATION_UI.emailLabel}
                </Label>
                <p className="text-muted-foreground text-xs leading-relaxed">{NOTIFICATION_UI.emailHelp}</p>
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
                    <span className="text-muted-foreground text-xs tabular-nums">{NOTIFICATION_UI.saving}</span>
                  </>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Croatian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-sm">Customize your app appearance</p>
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
            <p className="text-sm text-muted-foreground">
              Kampagnen unter{" "}
              <Link href="/brevo" className="font-medium text-primary underline-offset-4 hover:underline">
                /brevo
              </Link>
              , Kontakt-Sync unter{" "}
              <Link href="/brevo/sync" className="font-medium text-primary underline-offset-4 hover:underline">
                /brevo/sync
              </Link>
              . API-Schlüssel: Umgebungsvariable{" "}
              <span className="font-mono text-foreground">BREVO_API_KEY</span> in{" "}
              <span className="font-mono text-foreground">.env.local</span> (v3-Key, meist{" "}
              <span className="font-mono">xkeysib-</span>).
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
