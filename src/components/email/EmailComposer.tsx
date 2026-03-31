// src/components/email/EmailComposer.tsx
// Client Component for composing email content based on templates and providing a live preview of the email before sending.

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser-client";
import type { EmailTemplate } from "@/lib/supabase/database.types";
import { updateEmailTemplate } from "@/lib/supabase/services/email";

type EmailComposerProps = {
  selectedTemplateId: string;
  subject: string;
  setSubject: (subject: string) => void;
  body: string;
  setBody: (body: string) => void;
  templates: EmailTemplate[];
  handleTemplateChange: (id: string) => void;
};

export default function EmailComposer({
  selectedTemplateId,
  subject,
  setSubject,
  body,
  setBody,
  templates,
  handleTemplateChange,
}: EmailComposerProps) {
  const queryClient = useQueryClient();

  const saveToTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateId) throw new Error("Keine Vorlage ausgewählt");
      const client = createClient();
      return updateEmailTemplate(selectedTemplateId, { subject, body }, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("In Vorlage gespeichert");
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Speichern", { description: error.message });
    },
  });

  const handleSaveToTemplate = () => {
    saveToTemplateMutation.mutate();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-1">
        <CardTitle>E-Mail erstellen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div>
          <Label className="mb-3">Vorlage</Label>
          <div className="flex gap-3">
            <div className="flex-1">
              {templates.length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <p className="text-muted-foreground mb-4">Noch keine Vorlagen vorhanden</p>
                  <Link href="/mass-email/templates">
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Vorlage erstellen
                    </Button>
                  </Link>
                </div>
              ) : (
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
              )}
            </div>
            {templates.length > 0 && (
              <>
                {selectedTemplateId && (
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={handleSaveToTemplate}
                    disabled={saveToTemplateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    In Vorlage speichern
                  </Button>
                )}
                <Link href="/mass-email/templates">
                  <Button variant="outline" className="h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Vorlage
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div>
          <Label className="mb-3">Betreff</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Betreff der E-Mail" />
        </div>

        <div>
          <Label className="mb-3">Inhalt (HTML unterstützt)</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Verwenden Sie {{vorname}}, {{firmenname}}, {{anrede}} ..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
