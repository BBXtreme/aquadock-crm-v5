// src/app/(protected)/mass-email/ClientMassEmailPage.tsx
// This file defines the ClientMassEmailPage component, which allows users to create and send mass email campaigns to their contacts or companies.
// It includes recipient selection, email template selection, live preview, and progress tracking for sending emails.

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    { name: "Max Mustermann", firmenname: "Beispiel GmbH" };
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

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Empfänger Card */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Empfänger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button 
                  variant={mode === "contacts" ? "default" : "outline"} 
                  onClick={() => setMode("contacts")} 
                  className="flex-1"
                >
                  Kontakte
                </Button>
                <Button 
                  variant={mode === "companies" ? "default" : "outline"} 
                  onClick={() => setMode("companies")} 
                  className="flex-1"
                >
                  Firmen
                </Button>
              </div>

              <Input 
                placeholder="Name, E-Mail oder Firma suchen..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handleSelectAll} size="sm">
                  {selectedRecipientIds.length === recipients.length ? "Auswahl aufheben" : "Alle auswählen"}
                </Button>
                <span className="text-sm text-muted-foreground">{recipients.length} gefunden</span>
              </div>

              <ScrollArea className="h-96 border rounded-md">
                {isLoading ? (
                  <div className="p-8 text-center">Lade Empfänger...</div>
                ) : (
                  recipients.map((rec) => (
                    <div key={rec.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent cursor-pointer border-b last:border-0">
                      <Checkbox
                        aria-label={`Select ${rec.name}`}
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

          {/* E-Mail erstellen Card */}
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
                    <Button variant="outline" className="h-8">
                      <Plus className="h-4 w-4 mr-1" />
                      Neue Vorlage
                    </Button>
                  </Link>
                </div>
              </div>

              <div>
                <Label className="mb-2">Betreff</Label>
                <Input 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  placeholder="Betreff der E-Mail" 
                />
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

        {/* Live-Vorschau (full width, taller) */}
        <Card>
          <CardHeader>
            <CardTitle>Live-Vorschau</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="preview"><Eye className="mr-2 h-4 w-4" />Vorschau</TabsTrigger>
                <TabsTrigger value="raw"><Code className="mr-2 h-4 w-4" />Quelltext</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="min-h-[600px]">
                <div className="border rounded-xl p-8 bg-card h-full">
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Betreff:</div>
                      <div className="font-bold text-xl leading-tight">
                        {previewSubject || "Kein Betreff"}
                      </div>
                    </div>
                    <div className="prose dark:prose-invert text-[15px] leading-relaxed whitespace-pre-wrap">
                      {previewBody || "Kein Inhalt"}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="raw" className="min-h-[600px]">
                <ScrollArea className="h-[600px] border rounded-xl p-6 bg-muted">
                  <strong>Betreff:</strong> {previewSubject}
                  <br /><br />
                  <strong>Inhalt:</strong>
                  <pre className="mt-4 whitespace-pre-wrap">{previewBody}</pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <Separator className="my-8" />

            <div className="flex gap-4">
              <Button 
                onClick={() => handleSend(false)} 
                disabled={selectedRecipientIds.length === 0} 
                className="flex-1"
                size="lg"
              >
                <Send className="mr-2 h-5 w-5" />
                Senden ({selectedRecipientIds.length})
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleSend(true)} 
                className="flex-1"
                size="lg"
              >
                <TestTube className="mr-2 h-5 w-5" />
                Testsendung
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
