// src/components/email/SmtpSettings.tsx
// Client Component for managing SMTP settings, allowing users to input their SMTP server details and test the connection.

"use client";

import type { User } from "@supabase/supabase-js";
import { Mail, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";

export default function SmtpSettings() {
  const t = useT("settings.smtp");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [secure, setSecure] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const loadConfig = useCallback(async (opts?: { signal?: AbortSignal; notify?: boolean }) => {
    const signal = opts?.signal;
    const notify = opts?.notify === true;
    setIsLoadingConfig(true);
    try {
      const { getSmtpConfig } = await import("@/lib/services/smtp");
      const config = await getSmtpConfig();
      if (signal?.aborted) {
        return;
      }
      if (config) {
        setHost(config.host || "");
        setPort(String(config.port) || "587");
        setUser(config.user || "");
        setPassword(config.password || "");
        setFromName(config.fromName || "");
        setSecure(config.secure || false);
        if (notify) {
          toast.success(t("toastConfigLoaded"), {
            description: t("toastConfigLoadedDescLoaded"),
          });
        }
      } else if (notify) {
        toast.success(t("toastConfigLoaded"), {
          description: t("toastConfigLoadedDescEmpty"),
        });
      }
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      console.error("Failed to load SMTP config:", error);
      const message = error instanceof Error ? error.message : t("toastLoadFailedDefaultDesc");
      toast.error(t("toastLoadFailedTitle"), {
        description: message,
      });
    } finally {
      if (!signal?.aborted) {
        setIsLoadingConfig(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const ac = new AbortController();
    void loadConfig({ signal: ac.signal });
    return () => {
      ac.abort();
    };
  }, [currentUser, loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { saveSmtpConfig } = await import("@/lib/services/smtp");
      const config = { host, port, user, password, fromName, secure };
      await saveSmtpConfig(config);
      toast.success(t("toastSaved"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("toastSaveErrorDefault");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error(t("toastTestEmailRequired"));
      return;
    }

    setIsTesting(true);
    try {
      const { sendTestEmail } = await import("@/lib/services/send-test-email");
      const _result = await sendTestEmail(testEmail);
      toast.success(t("toastTestSent"), { description: t("toastTestSentDescription", { email: testEmail }) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("toastTestFailedDefault");
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          {t("cardTitle")}
        </CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="smtp-host" className="text-sm font-medium">
            {t("hostLabel")}
          </Label>
          <Input
            id="smtp-host"
            className="max-w-md"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={t("hostPlaceholder")}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-port" className="text-sm font-medium">
            {t("portLabel")}
          </Label>
          <Input
            id="smtp-port"
            className="max-w-md"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder={t("portPlaceholder")}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-user" className="text-sm font-medium">
            {t("userLabel")}
          </Label>
          <Input
            id="smtp-user"
            className="max-w-md"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder={t("userPlaceholder")}
            autoComplete="username"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-password" className="text-sm font-medium">
            {t("passwordLabel")}
          </Label>
          <Input
            id="smtp-password"
            className="max-w-md"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-from-name" className="text-sm font-medium">
            {t("fromNameLabel")}
          </Label>
          <Input
            id="smtp-from-name"
            className="max-w-md"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder={t("fromNamePlaceholder")}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="secure"
            checked={secure}
            onCheckedChange={(checked) => setSecure(checked === true)}
          />
          <Label htmlFor="secure" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("secureLabel")}
          </Label>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-test-email" className="text-sm font-medium">
              {t("testEmailLabel")}
            </Label>
            <Input
              id="smtp-test-email"
              className="max-w-md"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={t("testEmailPlaceholder")}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void loadConfig()}
              disabled={isLoadingConfig}
              variant="outline"
              size="icon"
              title={t("reloadConfigTitle")}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingConfig ? "animate-spin" : ""}`} />
            </Button>
            <Button type="button" onClick={() => void handleTest()} disabled={isTesting}>
              {isTesting ? t("testButtonSending") : t("testButton")}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? t("saveButtonSaving") : t("saveButton")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
