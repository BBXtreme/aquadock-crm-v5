"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Eye, EyeOff, Mail, MapPin, Palette, Send, Settings, Shield, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { poiCategories } from "@/lib/constants/map-poi-config";
import { createClient } from "@/lib/supabase/browser";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1, "Port must be at least 1").max(65535, "Port must be at most 65535"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  from_email: z.string().email("Valid email is required"),
  from_name: z.string().min(1, "From name is required"),
});

type SmtpForm = z.infer<typeof smtpSchema>;

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

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [userId, setUserId] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const smtpMutation = useMutation({
    mutationFn: async (values: SmtpForm) => {
      const { error } = await supabase.from("user_settings").upsert({
        id: "default", // Assuming single user settings
        smtp_host: values.host,
        smtp_port: values.port,
        smtp_username: values.username,
        smtp_password: values.password,
        smtp_from_email: values.from_email,
        smtp_from_name: values.from_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("SMTP settings saved");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to save SMTP settings", { description: message });
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

  const testEmailMutation = useMutation({
    mutationFn: async (recipient: string) => {
      const response = await fetch("/api/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send test email");
      }
    },
    onSuccess: () => {
      toast.success("Test email sent successfully");
      setTestRecipient("");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to send test email", { description: message });
    },
  });

  const testOverpassMutation = useMutation({
    mutationFn: async () => {
      const query = generateSampleQuery();
      const endpoint = openMapSettings.overpassEndpoints[0];
      if (!endpoint) throw new Error("No Overpass endpoint configured");
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
  const tagGroups: Record<string, string[]> = useMemo(() => {
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

  const smtpForm = useForm<SmtpForm>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: (settings.smtp_host as string) || "",
      port: (settings.smtp_port as number) || 587,
      username: (settings.smtp_username as string) || "",
      password: (settings.smtp_password as string) || "",
      from_email: (settings.smtp_from_email as string) || "",
      from_name: (settings.smtp_from_name as string) || "",
    },
  });

  const clearCache = () => {
    localStorage.removeItem("openmap-poi-cache");
    if (confirm("Clear POI cache and reload the page to apply changes?")) {
      window.location.reload();
    }
  };

  const onSmtpSubmit = smtpForm.handleSubmit((data) => {
    smtpMutation.mutate(data);
  });

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
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
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
                value={openMapSettings.overpassEndpoints.join('\n')}
                onChange={(e) => setOpenMapSettings(prev => ({ ...prev, overpassEndpoints: e.target.value.split('\n').filter(Boolean) }))}
                placeholder="One endpoint per line"
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoLoadPois" className="text-sm font-medium">
                Auto Load POIs
              </Label>
              <Switch id="autoLoadPois" checked={openMapSettings.autoLoadPois} onCheckedChange={(checked) => setOpenMapSettings(prev => ({ ...prev, autoLoadPois: checked }))} />
            </div>
            <div className="space-y-2">
              <Label>Cache Duration (minutes)</Label>
              <Input
                type="number"
                value={openMapSettings.cacheDuration}
                onChange={(e) => setOpenMapSettings(prev => ({ ...prev, cacheDuration: parseInt(e.target.value) || 10 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Cache Size (MB)</Label>
              <Input
                type="number"
                value={openMapSettings.maxCacheSize}
                onChange={(e) => setOpenMapSettings(prev => ({ ...prev, maxCacheSize: parseInt(e.target.value) || 30 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sample Overpass Query</Label>
              <Textarea
                value={generateSampleQuery()}
                readOnly
                rows={10}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openMapMutation.mutate()} disabled={openMapMutation.isPending}>
                {openMapMutation.isPending ? "Saving..." : "Save OpenMap Settings"}
              </Button>
              <Button variant="outline" onClick={clearCache}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear POI Cache
              </Button>
              <Button variant="outline" onClick={() => testOverpassMutation.mutate()} disabled={testOverpassMutation.isPending}>
                {testOverpassMutation.isPending ? "Testing..." : "Test Overpass"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SMTP Card */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              SMTP-Konfiguration für den E-Mail Versand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...smtpForm}>
              <form onSubmit={onSmtpSubmit} className="space-y-4">
                <FormField
                  control={smtpForm.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="587"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Username</FormLabel>
                      <FormControl>
                        <Input placeholder="your-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="your-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="from_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Email</FormLabel>
                      <FormControl>
                        <Input placeholder="noreply@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="from_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your App Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={smtpMutation.isPending}>
                  {smtpMutation.isPending ? "Saving..." : "Save SMTP Settings"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Test Email</h3>
              <div className="flex space-x-2">
                <Input
                  placeholder="test@example.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => testEmailMutation.mutate(testRecipient)}
                  disabled={testEmailMutation.isPending || !testRecipient}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delete Account</Label>
              <p className="text-muted-foreground text-sm">Permanently delete your account and all data</p>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
            <p className="text-red-600 text-sm">This action cannot be undone</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
