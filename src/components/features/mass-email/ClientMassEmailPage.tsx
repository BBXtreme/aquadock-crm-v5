// src/components/features/mass-email/ClientMassEmailPage.tsx
// This file defines the ClientMassEmailPage component, which is the main page for sending mass emails in the application. It allows users to select recipients, choose email templates, compose their message, and send it out while showing progress and results.

"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import EmailComposer from "@/components/email/EmailComposer";
import LivePreview from "@/components/email/LivePreview";
import RecipientSelector from "@/components/email/RecipientSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { sendMassEmailAction } from "@/lib/actions/mass-email";
import { useT } from "@/lib/i18n/use-translations";
import { fillPlaceholders, getEmailTemplates, getMassEmailRecipients } from "@/lib/services/email";
import { createClient } from "@/lib/supabase/browser";
import type { EmailTemplate } from "@/types/database.types";

type SendResults = {
  success: boolean;
  sent: number;
  errors: number;
  total: number;
  filteredCount?: number;
};

export default function ClientMassEmailPage() {
  const t = useT("massEmail");
  const [mode, setMode] = useState<"contacts" | "companies">("contacts");
  const [search, setSearch] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendResults, setSendResults] = useState<SendResults | null>(null);

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const client = createClient();
      return getEmailTemplates(client);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Recipients
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["mass-recipients", mode, search],
    queryFn: async () => {
      const client = createClient();
      return getMassEmailRecipients(client, { mode, search: search || undefined });
    },
    staleTime: 30 * 1000,
  });

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templates.find((t: EmailTemplate) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  const handleSend = async (isTest = false, testEmail?: string) => {
    if (!isTest && selectedRecipientIds.length === 0) {
      toast.error(t("toastSelectRecipients"));
      return;
    }

    setShowProgress(true);
    setProgress(0);

    try {
      const result = await sendMassEmailAction({
        mode,
        subject,
        body,
        delayMs: 800,
        ...(isTest && testEmail ? { testEmail } : (mode === "contacts" ? { contact_ids: selectedRecipientIds } : { company_ids: selectedRecipientIds })),
      });

      setSendResults(result);
      setProgress(100);

      toast.success(t("toastSuccess", { sent: result.sent, total: result.total }));
      if (result.errors > 0) toast.warning(t("toastErrors", { count: result.errors }));
      if (result.filteredCount && result.filteredCount > 0) {
        toast.warning(t("toastFiltered", { count: result.filteredCount }));
      }

      setSelectedRecipientIds([]);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(t("toastSendFailed"), { description: err.message });
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
  const previewRecipient = recipients.find((r) => selectedRecipientIds.includes(r.id)) || {
    name: t("previewName"),
    firmenname: t("previewCompany"),
    email: t("previewEmail"),
  };
  const previewSubject = useMemo(() => fillPlaceholders(subject, previewRecipient), [subject, previewRecipient]);
  const previewBody = useMemo(() => fillPlaceholders(body, previewRecipient), [body, previewRecipient]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-muted-foreground">{t("breadcrumb")}</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1.5">
            <Users className="h-4 w-4" /> {t("selectedBadge", { count: selectedRecipientIds.length })}
          </Badge>
          <Link href="/mass-email/log">
            <Button variant="outline" size="sm">
              {t("viewLog")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <DialogTitle>{t("progressTitle")}</DialogTitle>
            <DialogDescription>{t("progressDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {sendResults
                ? t("progressSummary", { sent: sendResults.sent, errors: sendResults.errors })
                : t("progressWait")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
