// src/app/(protected)/settings/ClientSettingsPage.tsx
// This file defines the ClientSettingsPage component, which is the main settings page for the application. It includes sections for notifications, appearance, OpenMap settings, and SMTP email settings. Users can configure their preferences and save them, with changes being persisted to the database and local storage as needed.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, MapPin, Palette, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SmtpSettings from "@/components/email/SmtpSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { createClient } from "@/lib/supabase/browser-client";

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
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
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

  const supabase = createClient();
  const _queryClient = useQueryClient();

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

  if (isLoading) {
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
    <div>
      <div>
        <p className="text-muted-foreground text-sm">Home {">"} Settings</p>
        <h1 className="font-semibold text-3xl tracking-tight">Settings</h1>
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
                  <SelectItem value="fr">Français</SelectItem>
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

        {/* SMTP Settings */}
        <div className="md:col-span-2">
          <SmtpSettings />
        </div>
      </div>
    </div>
  );
}

export default ClientSettingsPage;
