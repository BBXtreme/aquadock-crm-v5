"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Eye, EyeOff, Mail, Palette, Send, Settings, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/browser";
import { getUserSettings, upsertUserSetting } from "@/lib/supabase/services/user-settings";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1, "Port must be at least 1").max(65535, "Port must be at most 65535"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  senderName: z.string().min(1, "Sender name is required"),
});

type SmtpForm = z.infer<typeof smtpSchema>;

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [userId, setUserId] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, [supabase.auth]);

  const { data: settings } = useQuery({
    queryKey: ["user-settings", userId],
    queryFn: () => (userId ? getUserSettings(userId) : Promise.resolve([])),
    enabled: !!userId,
  });

  const form = useForm<SmtpForm>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: "",
      port: 587,
      username: "",
      password: "",
      senderName: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        host: (settings.find((s) => s.key === "smtp_host")?.value as string) || "",
        port: parseInt((settings.find((s) => s.key === "smtp_port")?.value as string) || "587", 10),
        username: (settings.find((s) => s.key === "smtp_username")?.value as string) || "",
        password: (settings.find((s) => s.key === "smtp_password")?.value as string) || "",
        senderName: (settings.find((s) => s.key === "smtp_sender_name")?.value as string) || "",
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: async (data: SmtpForm) => {
      if (!userId) throw new Error("User not authenticated");
      const promises = [
        upsertUserSetting({ user_id: userId, key: "smtp_host", value: data.host }),
        upsertUserSetting({ user_id: userId, key: "smtp_port", value: data.port.toString() }),
        upsertUserSetting({ user_id: userId, key: "smtp_username", value: data.username }),
        upsertUserSetting({ user_id: userId, key: "smtp_password", value: data.password }),
        upsertUserSetting({ user_id: userId, key: "smtp_sender_name", value: data.senderName }),
      ];
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", userId] });
      toast.success("SMTP settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save SMTP settings", { description: error.message });
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
      toast.error("Failed to send test email", { description: error.message });
    },
  });

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-muted-foreground text-sm">Home {">"} Settings</p>
        <h1 className="font-semibold text-3xl tracking-tight">Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Push Notifications</Label>
              <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailAlerts">Email Alerts</Label>
              <Switch id="emailAlerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <p className="text-muted-foreground text-sm">Configure how you receive notifications</p>
          </CardContent>
        </Card>

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

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Two-Factor Authentication</Label>
              <p className="text-muted-foreground text-sm">Not configured</p>
              <Button variant="outline" size="sm">
                Enable 2FA
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Data Export</Label>
              <p className="text-muted-foreground text-sm">Download your data</p>
              <Button variant="outline" size="sm">
                Export Data
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">Manage your privacy and security settings</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Advanced
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Access</Label>
              <p className="text-muted-foreground text-sm">Manage API keys and integrations</p>
              <Button variant="outline" size="sm">
                Manage API
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Data Retention</Label>
              <p className="text-muted-foreground text-sm">Configure data retention policies</p>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">Advanced settings for power users</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              SMTP-Konfiguration für den E-Mail Versand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} {...field} />
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
                </div>
                <FormField
                  control={form.control}
                  name="senderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Absendername</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Settings"}
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
      </div>

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
  );
}
