// src/app/(protected)/mass-email/ClientMassEmailPage.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sendMassEmailAction } from '@/app/actions/send-mass-email';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/browser-client";
import type { EmailTemplate } from "@/lib/supabase/database.types";
import { fillPlaceholders, getEmailTemplates, getMassEmailRecipients } from "@/lib/supabase/services/email";
import EmailComposer from "./components/EmailComposer";
import LivePreview from "./components/LivePreview";
import RecipientSelector from "./components/RecipientSelector";

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
  const [currentUser, setCurrentUser] = useState<any>(null);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecipientSelector
          mode={mode}
          setMode={setMode}
          search={search}
          setSearch={setSearch}
          selectedRecipientIds={selectedRecipientIds}
          setSelectedRecipientIds={setSelectedRecipientIds}
          recipients={recipients}
          isLoading={isLoading}
          handleSelectAll={handleSelectAll}
        />
        <EmailComposer
          selectedTemplateId={selectedTemplateId}
          setSelectedTemplateId={setSelectedTemplateId}
          subject={subject}
          setSubject={setSubject}
          body={body}
          setBody={setBody}
          templates={templates}
          handleTemplateChange={handleTemplateChange}
        />
      </div>

      <LivePreview
        previewSubject={previewSubject}
        previewBody={previewBody}
        previewRecipient={previewRecipient}
        selectedRecipientIds={selectedRecipientIds}
        handleSend={handleSend}
      />

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
