// src/components/email/SmtpSettings.tsx
// Client Component for managing SMTP settings, allowing users to input their SMTP server details and test the connection.

"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser-client";

export default function SmtpSettings() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [secure, setSecure] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      setLoadingUser(false);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const client = createClient();
    client
      .from('user_settings')
      .select('value')
      .eq('user_id', currentUser.id)
      .eq('key', 'smtp_config')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const config = JSON.parse(data.value);
          setHost(config.host || "");
          setPort(config.port || "587");
          setUser(config.user || "");
          setPassword(config.password || "");
          setFromName(config.fromName || "");
          setSecure(config.secure || false);
        }
      });
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) {
      toast.error("Benutzer nicht authentifiziert");
      return;
    }
    setIsSaving(true);
    try {
      const client = createClient();
      const config = { host, port, user, password, fromName, secure };
      await client.from('user_settings').upsert({
        user_id: currentUser.id,
        key: 'smtp_config',
        value: JSON.stringify(config),
      });
      toast.success("SMTP-Konfiguration gespeichert");
    } catch (_error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error("Bitte eine Test-E-Mail-Adresse eingeben");
      return;
    }

    setIsTesting(true);
    try {
      const { sendTestEmail } = await import("@/lib/supabase/services/send-test-email");
      const result = await sendTestEmail(testEmail);
      toast.success(result.message || "Test-E-Mail erfolgreich gesendet!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Test fehlgeschlagen";
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP-Konfiguration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Host</Label>
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.example.com"
          />
        </div>
        <div>
          <Label>Port</Label>
          <Input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="587"
          />
        </div>
        <div>
          <Label>User (E-Mail)</Label>
          <Input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="your@email.com"
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>From Name</Label>
          <Input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="AquaDock CRM"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="secure"
            checked={secure}
            onCheckedChange={(checked) => setSecure(checked === true)}
          />
          <Label htmlFor="secure">SSL/TLS verwenden</Label>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Test-E-Mail-Adresse</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="deine@email.de"
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={handleTest} disabled={isTesting || !testEmail} className="flex-1">
              {isTesting ? "Sende Test..." : "Verbindung testen & E-Mail senden"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || loadingUser} className="flex-1">
              {isSaving ? "Speichere..." : "Konfiguration speichern"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
