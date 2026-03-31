// src/app/(protected)/mass-email/ClientMassEmailPage.tsx
// This file defines the ClientMassEmailPage component, which allows users to create and send mass email campaigns to their contacts or companies.
// It includes recipient selection, email template selection, live preview, and progress tracking for sending emails.
// Additionally, it provides template management with create, edit, delete, and preview functionality.

"use client";

import type { User } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Edit, Eye, Plus, Send, TestTube, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sendMassEmailAction } from '@/app/actions/send-mass-email';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createEmailTemplate, deleteEmailTemplate, fillPlaceholders, getEmailTemplates, getMassEmailRecipients, updateEmailTemplate } from "@/lib/supabase/services/email";

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

  // Template management state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  // Templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
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

  // Mutations for templates
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; subject: string; body: string }) => {
      const client = createClient();
      return createEmailTemplate({ name: data.name, subject: data.subject, body: data.body }, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Vorlage erstellt");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Erstellen", { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; subject: string; body: string }) => {
      const client = createClient();
      return updateEmailTemplate(data.id, { name: data.name, subject: data.subject, body: data.body }, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Vorlage aktualisiert");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Aktualisieren", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = createClient();
      return deleteEmailTemplate(id, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Vorlage gelöscht");
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Löschen", { description: error.message });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormSubject("");
    setFormBody("");
    setEditingTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setDialogOpen(true);
  };

  const openPreviewDialog = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!formName.trim() || !formSubject.trim()) {
      toast.error("Name und Betreff sind erforderlich");
      return;
    }
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, name: formName, subject: formSubject, body: formBody });
    } else {
      createMutation.mutate({ name: formName, subject: formSubject, body: formBody });
    }
  };

  const handleDeleteTemplate = (id: string) => {
    deleteMutation.mutate(id);
  };

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
      toast.error("Benutzer nicht authentifiziert. Bitte melden Sie sich an.");
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

      if (result.failed > 0) {
        toast.warning(`${result.failed} E-Mails konnten nicht gesendet werden.`);
      }

      setSelectedRecipientIds([]);
    } catch (error: unknown) {
      toast.error("Versand fehlgeschlagen", { description: (error as Error).message });
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

      <Tabs defaultValue="campaign" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaign">Kampagne erstellen</TabsTrigger>
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign">
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

                  <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={handleSelectAll} size="sm">
                      {selectedRecipientIds.length === recipients.length ? "Auswahl aufheben" : "Alle auswählen"}
                    </Button>
                    <span className="text-sm text-muted-foreground">{recipients.length} Empfänger gefunden</span>
                  </div>

                  <ScrollArea className="h-80 border rounded-md">
                    {isLoading ? (
                      <div className="p-4">Lade Empfänger...</div>
                    ) : (
                      recipients.map((rec) => (
                        <label htmlFor={rec.id} key={rec.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent cursor-pointer border-b last:border-0">
                          <Checkbox
                            id={rec.id}
                            checked={selectedRecipientIds.includes(rec.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedRecipientIds((prev) => [...prev, rec.id]);
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
                      <div className="space-y-4">
                        <div className="border-b pb-3 mb-4">
                          <div className="text-xs text-muted-foreground">Von: AquaDock CRM</div>
                          <div className="text-xs text-muted-foreground">An: {previewRecipient.name}</div>
                        </div>
                        <div className="border-b pb-3">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Betreff:</div>
                          <div className="font-bold text-lg leading-tight">{previewSubject || "Kein Betreff"}</div>
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans bg-muted/30 p-4 rounded-md">
                          {previewBody || "Kein Inhalt"}
                        </div>
                      </div>
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
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Vorlagen</h2>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Neue Vorlage
            </Button>
          </div>

          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4", "skeleton-5", "skeleton-6"].map((key) => (
                <Card key={key} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </CardContent>
                  <CardFooter>
                    <div className="h-8 bg-muted rounded w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Aktualisiert: {new Date(template.updated_at || template.created_at || new Date()).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPreviewDialog(template)}>
                      <Eye className="mr-1 h-3 w-3" />
                      Vorschau
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                      <Edit className="mr-1 h-3 w-3" />
                      Bearbeiten
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="mr-1 h-3 w-3" />
                          Löschen
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Die Vorlage "{template.name}" wird dauerhaft gelöscht.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Name *</Label>
              <Input
                id="template-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="z.B. Einführung E-Mail"
              />
            </div>
            <div>
              <Label htmlFor="template-subject">Betreff *</Label>
              <Input
                id="template-subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="z.B. Willkommen bei AquaDock"
              />
            </div>
            <div>
              <Label htmlFor="template-body">Inhalt</Label>
              <Textarea
                id="template-body"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={8}
                placeholder={`Hallo {{vorname}},

wir freuen uns, Sie als {{firmenname}} begrüßen zu dürfen.

Verfügbare Platzhalter: {{vorname}}, {{nachname}}, {{firmenname}}, {{anrede}}, {{name}}, {{stadt}}`}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveTemplate} disabled={createMutation.isPending || updateMutation.isPending}>
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vorlagen-Vorschau</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Betreff</Label>
                <div className="font-semibold text-lg border rounded p-2 bg-muted">{previewTemplate.subject}</div>
              </div>
              <div>
                <Label>Inhalt</Label>
                <ScrollArea className="h-64 border rounded p-4 bg-muted">
                  <div className="whitespace-pre-wrap">{previewTemplate.body}</div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={showProgress} onOpenChange={setShowProgress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Mails werden versendet...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {sendResults ? `${sendResults.sent} erfolgreich • ${sendResults.failed} Fehler` : "Bitte warten..."}
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
