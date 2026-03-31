// src/app/(protected)/mass-email/ClientMassEmailPage.tsx
// This file defines the ClientMassEmailPage component, which allows users to create and send mass emails to contacts or companies. It includes features like selecting recipients, choosing email templates, live preview, and sending emails (simulated in Phase 1).

"use client";

import { useQuery } from "@tanstack/react-query";
import { Send, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser-client";
import { fillPlaceholders, getEmailTemplates, getMassEmailRecipients } from "@/lib/supabase/services/email";

export default function ClientMassEmailPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"contacts" | "companies">("contacts");
  const [search, setSearch] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const client = createClient();
      return getEmailTemplates(client);
    },
  });

  // Fetch recipients (debounced search could be added later)
  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ["mass-recipients", mode, search],
    queryFn: async () => {
      const client = createClient();
      return getMassEmailRecipients(client, { mode, search: search.trim() || undefined });
    },
  });

  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  // Load template when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      if (tpl) {
        setSubject(tpl.subject);
        setBody(tpl.body);
      }
    }
  }, [selectedTemplateId, templates]);

  const selectedRecipients = recipients.filter((r) => selectedRecipientIds.includes(r.id));

  // Live preview with first selected recipient or fallback
  const previewRecipient = selectedRecipients[0] || { name: "Max Mustermann", firmenname: "Beispiel GmbH" };
  const previewSubject = fillPlaceholders(subject, previewRecipient);
  const previewBody = fillPlaceholders(body, previewRecipient);

  const handleSend = async () => {
    if (selectedRecipientIds.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Empfänger aus.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Betreff und Inhalt sind erforderlich.");
      return;
    }

    setIsSending(true);
    try {
      // TODO: Real send via server action / service (Phase 2)
      await new Promise((resolve) => setTimeout(resolve, 1500)); // simulate

      toast.success(`${selectedRecipientIds.length} E-Mails wurden erfolgreich versendet!`, {
        description: "Details im Versandlog einsehbar.",
      });

      // Reset form
      setSelectedRecipientIds([]);
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
    } catch (err) {
      toast.error("Versand fehlgeschlagen", { description: String(err) });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Massen-E-Mail</h1>
          <p className="text-muted-foreground">Professionelle Kampagnen an Kontakte oder Firmen senden</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3.5 w-3.5" />
          {selectedRecipientIds.length} ausgewählt
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Setup */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Empfänger auswählen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
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
                  Firmen (E-Mail)
                </Button>
              </div>

              <Input
                placeholder="Suchen nach Name, E-Mail oder Firma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <ScrollArea className="h-80 border rounded-md p-2">
                {recipientsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Keine Empfänger gefunden</div>
                ) : (
                  recipients.map((recipient) => {
                    const isSelected = selectedRecipientIds.includes(recipient.id);
                    return (
                      <label
                        key={recipient.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-accent rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipientIds((prev) => [...prev, recipient.id]);
                            } else {
                              setSelectedRecipientIds((prev) => prev.filter((id) => id !== recipient.id));
                            }
                          }}
                          className="accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{recipient.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {recipient.email} {recipient.firmenname && `· ${recipient.firmenname}`}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </ScrollArea>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{recipients.length} Empfänger geladen</span>
                <button
                  onClick={() => setSelectedRecipientIds(recipients.map((r) => r.id))}
                  className="underline hover:text-foreground"
                >
                  Alle auswählen
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>E-Mail zusammenstellen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Vorlage (optional)</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vorlage wählen oder manuell erstellen" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Betreff</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Betreff der E-Mail"
                />
              </div>

              <div>
                <Label htmlFor="body">Inhalt</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="E-Mail Inhalt hier eingeben... Unterstützt {{vorname}}, {{firmenname}} etc."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Live Vorschau
                <Badge variant="secondary">für {previewRecipient.name}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Vorschau</TabsTrigger>
                  <TabsTrigger value="raw">Roh</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="border rounded-lg p-6 bg-white dark:bg-zinc-950 min-h-[400px] prose dark:prose-invert">
                    <div className="font-semibold text-lg mb-2">{previewSubject || "Kein Betreff"}</div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: previewBody.replace(/\n/g, "<br>"),
                      }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <ScrollArea className="h-96 border rounded p-4 font-mono text-sm bg-muted/50">
                    <div className="font-medium">Betreff:</div>
                    <div className="mb-4">{previewSubject}</div>
                    <div className="font-medium">Inhalt:</div>
                    <pre className="whitespace-pre-wrap">{previewBody}</pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              <Button onClick={handleSend} disabled={isSending || selectedRecipientIds.length === 0} className="w-full" size="lg">
                {isSending ? (
                  "Wird gesendet..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    An {selectedRecipientIds.length} Empfänger senden
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Hinweis: Echtes Senden kommt in Phase 2 (mit SMTP + Logging + Timeline)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}