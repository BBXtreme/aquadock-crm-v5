// src/app/(protected)/mass-email/ClientMassEmailPage.tsx
// This file defines the ClientMassEmailPage component, which allows users to create and send mass email campaigns to their contacts or companies.
// It includes recipient selection, email template selection, live preview, and progress tracking for sending emails.

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Send, TestTube, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { fillPlaceholders, getEmailTemplates, getMassEmailRecipients, sendMassEmail } from "@/lib/supabase/services/email";

export default function ClientMassEmailPage() {
  const [mode, setMode] = useState<"contacts" | "companies">("contacts");
  const [search, setSearch] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendResults, setSendResults] = useState<any>(null);

  const userId = "current-user-id"; // TODO: replace with real user from session in next phase

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

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: (payload: any) => sendMassEmail(payload),
    onMutate: () => setShowProgress(true),
    onSuccess: (result) => {
      setSendResults(result);
      toast.success(`${result.sent} von ${result.total} E-Mails erfolgreich versendet`);
      setSelectedRecipientIds([]);
      setProgress(100);
      setTimeout(() => setShowProgress(false), 2000);
    },
    onError: (err: any) => {
      toast.error("Versand fehlgeschlagen", { description: err.message });
      setShowProgress(false);
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
    if (selectedRecipientIds.length === 0 && !isTest) {
      toast.error("Bitte wählen Sie Empfänger aus");
      return;
    }

    const payload = {
      userId,
      templateId: selectedTemplateId || undefined,
      recipientIds: isTest ? [] : selectedRecipientIds, // test uses current user email later
      mode,
      subjectOverride: subject,
      bodyOverride: body,
      delayMs: 800,
    };

    sendMutation.mutate(payload);
  };

  // Live preview
  const previewRecipient = recipients.find((r) => selectedRecipientIds.includes(r.id)) || { name: "Max Mustermann", firmenname: "Beispiel GmbH" };
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Setup Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recipient Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle>Empfänger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode + Search */}
              <div className="flex gap-3">
                <Button variant={mode === "contacts" ? "default" : "outline"} onClick={() => setMode("contacts")} className="flex-1">
                  Kontakte
                </Button>
                <Button variant={mode === "companies" ? "default" : "outline"} onClick={() => setMode("companies")} className="flex-1">
                  Firmen
                </Button>
              </div>

              <Input placeholder="Name, E-Mail oder Firma suchen..." value={search} onChange={(e) => setSearch(e.target.value)} />

              <ScrollArea className="h-80 border rounded-md">
                {isLoading ? (
                  <div className="p-4">Lade Empfänger...</div>
                ) : (
                  recipients.map((rec) => (
                    <label key={rec.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent cursor-pointer border-b last:border-0">
                      <input
                        type="checkbox"
                        checked={selectedRecipientIds.includes(rec.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRecipientIds((prev) => [...prev, rec.id]);
                          else setSelectedRecipientIds((prev) => prev.filter((id) => id !== rec.id));
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{rec.name}</div>
                        <div className="text-sm text-muted-foreground">{rec.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Compose Card */}
          <Card>
            <CardHeader>
              <CardTitle>E-Mail erstellen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Vorlage</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vorlage auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t: EmailTemplate) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Betreff</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Betreff" />
              </div>

              <div>
                <Label>Inhalt (HTML unterstützt)</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder="Verwenden Sie {{vorname}}, {{firmenname}}, {{anrede}} ..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-5">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Live-Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Vorschau</TabsTrigger>
                  <TabsTrigger value="raw">Quelltext</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4 border rounded-lg p-6 bg-card min-h-[380px]">
                  <div className="font-semibold mb-3">{previewSubject || "Kein Betreff"}</div>
                  <div className="prose dark:prose-invert text-sm" dangerouslySetInnerHTML={{ __html: previewBody.replace(/\n/g, "<br>") }} />
                </TabsContent>
                <TabsContent value="raw" className="mt-4">
                  <ScrollArea className="h-96 font-mono text-xs bg-muted p-4 rounded">
                    <strong>Betreff:</strong> {previewSubject}
                    <br /><br />
                    <strong>Inhalt:</strong>
                    <pre>{previewBody}</pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              <div className="flex gap-3">
                <Button onClick={() => handleSend(false)} disabled={selectedRecipientIds.length === 0} className="flex-1">
                  <Send className="mr-2 h-4 w-4" />
                  Senden ({selectedRecipientIds.length})
                </Button>
                <Button variant="outline" onClick={() => handleSend(true)} className="flex-1">
                  <TestTube className="mr-2 h-4 w-4" />
                  Testsendung
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress Dialog */}
      <Dialog open={showProgress} onOpenChange={setShowProgress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Mails werden versendet...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {sendResults ? `${sendResults.sent} erfolgreich • ${sendResults.errors} Fehler` : "Bitte warten..."}
            </p>
            {sendResults && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Details im Versandlog verfügbar.</AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}