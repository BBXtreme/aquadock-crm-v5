"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SmtpSettings() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [secure, setSecure] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => setCurrentUser(data.user));
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
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!currentUser) {
      toast.error("Benutzer nicht authentifiziert");
      return;
    }
    setIsTesting(true);
    try {
      // TODO: Implement test SMTP action
      // For now, placeholder - in real implementation, call a server action to send test email
      toast.success("Test-E-Mail würde gesendet werden (noch nicht implementiert)");
    } catch (error) {
      toast.error("Test fehlgeschlagen");
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
            onCheckedChange={setSecure}
          />
          <Label htmlFor="secure">SSL/TLS verwenden</Label>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleTest} disabled={isTesting} className="flex-1">
            {isTesting ? "Teste..." : "Verbindung testen"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? "Speichere..." : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
