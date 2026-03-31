// src/app/(protected)/mass-email/ClientMassEmailPage.tsx
"use client";

import type { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { Code, Eye, Plus, Send, TestTube, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sendMassEmailAction } from '@/app/actions/send-mass-email';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser-client";
import type { EmailTemplate } from "@/lib/supabase/database.types";
import { fillPlaceholders, getEmailTemplates, getMassEmailRecipients } from "@/lib/supabase/services/email";

type SendResults = {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
};

export default function ClientMassEmailPage() {
  const [mode, setMode] = useState<"contacts" | "companies">("contacts");
  const [search, setSearch] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendResults, setSendResults] = useState<SendResults | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [previewTab, setPreviewTab] = useState<"preview" | "raw">("preview");

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const client = createClient();
      return getEmailTemplates(client);
    },
  });

  // Recipients
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["mass-recipients", mode, search],
    queryFn: async () => {
      const client = createClient();
      return getMassEmailRecipients(client, { mode, search: search || undefined });
    },
  });

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templates.find((t: EmailTemplate) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  const handleSend = async (isTest = false) => {
    if (!currentUser) {
      toast.error("Benutzer nicht authentifiziert.");
      return;
    }
    if (!isTest && selectedRecipientIds.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Empfänger aus.");
      return;
    }

    setShowProgress(true);
    setProgress(0);

    try {
      const result = await sendMassEmailAction({
        recipientIds: isTest ? [] : selectedRecipientIds,
        mode,
        subject,
        body,
        delayMs: 800,
      });

      setSendResults(result);
      setProgress(100);

      toast.success(`${result.sent} von ${result.total} E-Mails erfolgreich versendet!`);
      if (result.failed > 0) toast.warning(`${result.failed} E-Mails fehlgeschlagen.`);

      setSelectedRecipientIds([]);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Versand fehlgeschlagen", { description: err.message });
    } finally {
      setTimeout(() => setShowProgress(false), 1500);
    }
  };

  const handleSelectAll = () => {
    if (selectedRecipientIds.length === recipients.length) {
      setSelectedRecipientIds([]);
    } else {
      setSelectedRecipientIds(recipients.map((r) => r.id));
    }
  };

  // Live preview
  const previewRecipient = recipients.find((r) => selectedRecipientIds.includes(r.id)) || 
    { name: "Max Mustermann", firmenname: "Beispiel GmbH", email: "max@beispiel.de" };
  const previewSubject = fillPlaceholders(subject, previewRecipient);
  const previewBody = fillPlaceholders(body, previewRecipient);

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Massen-E-Mail</h1>
          <p className="text-muted-foreground">Professionelle Kampagnen versenden</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-4 w-4" /> {selectedRecipientIds.length} ausgewählt
        </Badge>
      </div>

      {/* First row: Empfänger + E-Mail erstellen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empfänger */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Empfänger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button variant={mode === "contacts" ? "default" : "outline"} onClick={() => setMode("contacts")} className="flex-1">
                Kontakte
              </Button>
              <Button variant={mode === "companies" ? "default" : "outline"} onClick={() => setMode("companies")} className="flex-1">
                Firmen
              </Button>
            </div>

            <Input placeholder="Name, E-Mail oder Firma suchen..." value={search} onChange={(e) => setSearch(e.target.value)} />

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleSelectAll} size="sm">
                {selectedRecipientIds.length === recipients.length ? "Auswahl aufheben" : "Alle auswählen"}
              </Button>
              <span className="text-sm text-muted-foreground">{recipients.length} gefunden</span>
            </div>

            <ScrollArea className="h-96 border rounded-xl">
              {isLoading ? (
                <div className="p-8 text-center">Lade Empfänger...</div>
              ) : (
                recipients.map((rec) => (
                  <div key={rec.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent cursor-pointer border-b last:border-0">
                    <Checkbox
                      checked={selectedRecipientIds.includes(rec.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedRecipientIds(prev => [...prev, rec.id]);
                        else setSelectedRecipientIds(prev => prev.filter(id => id !== rec.id));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{rec.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{rec.email}</div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* E-Mail erstellen */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>E-Mail erstellen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div>
              <Label className="mb-2">Vorlage</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vorlage auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t: EmailTemplate) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Link href="/mass-email/templates">
                  <Button variant="outline" className="h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Vorlage
                  </Button>
                </Link>
              </div>
            </div>

            <div>
              <Label className="mb-2">Betreff</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Betreff der E-Mail" />
            </div>

            <div>
              <Label className="mb-2">Inhalt (HTML unterstützt)</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder="Verwenden Sie {{vorname}}, {{firmenname}}, {{anrede}} ..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live-Vorschau – full width & prominent */}
      <Card>
        <CardHeader>
          <CardTitle>Live-Vorschau</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Simple toggle */}
          <div className="flex border-b">
            <button
              onClick={() => setPreviewTab("preview")}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${previewTab === "preview" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              <Eye className="inline mr-2 h-4 w-4" />
              Vorschau
            </button>
            <button
              onClick={() => setPreviewTab("raw")}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${previewTab === "raw" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              <Code className="inline mr-2 h-4 w-4" />
              Quelltext
            </button>
          </div>

          {/* Preview Content */}
          {previewTab === "preview" ? (
            <div className="border rounded-3xl p-8 bg-card min-h-[560px] shadow-sm">
              <div className="max-w-2xl mx-auto space-y-8">
                {/* Email header */}
                <div className="flex justify-between text-xs text-muted-foreground border-b pb-4">
                  <div>
                    <span className="font-medium">Von:</span> AquaDock CRM &lt;no-reply@aquadock.de&gt;
                  </div>
                  <div>
                    <span className="font-medium">An:</span> {previewRecipient.name} &lt;{previewRecipient.email}&gt;
                  </div>
                </div>

                {/* Subject */}
                <div className="font-bold text-2xl leading-tight">
                  {previewSubject || "Kein Betreff"}
                </div>

                {/* Body */}
                <div className="prose dark:prose-invert text-[15.5px] leading-relaxed whitespace-pre-wrap">
                  {previewBody || "Kein Inhalt"}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="min-h-[560px] border rounded-3xl p-8 bg-muted">
              <strong>Betreff:</strong> {previewSubject}
              <br /><br />
              <strong>Inhalt:</strong>
              <pre className="mt-6 whitespace-pre-wrap text-sm font-mono">{previewBody}</pre>
            </ScrollArea>
          )}

          <Separator className="my-8" />

          {/* Send buttons */}
          <div className="flex gap-4">
            <Button onClick={() => handleSend(false)} disabled={selectedRecipientIds.length === 0} className="flex-1" size="lg">
              <Send className="mr-2 h-5 w-5" />
              Senden ({selectedRecipientIds.length})
            </Button>
            <Button variant="outline" onClick={() => handleSend(true)} className="flex-1" size="lg">
              <TestTube className="mr-2 h-5 w-5" />
              Testsendung
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Dialog */}
      <Dialog open={showProgress} onOpenChange={setShowProgress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Mails werden versendet...</DialogTitle>
            <DialogDescription>
              Ihre E-Mails werden im Hintergrund versendet. Bitte warten Sie, bis der Vorgang abgeschlossen ist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {sendResults ? `${sendResults.sent} erfolgreich • ${sendResults.failed} Fehler` : "Bitte warten..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}