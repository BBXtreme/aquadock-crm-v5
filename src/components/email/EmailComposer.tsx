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
import { useT } from "@/lib/i18n/use-translations";
import { updateEmailTemplate } from "@/lib/services/email";
import { createClient } from "@/lib/supabase/browser";
import type { EmailTemplate } from "@/types/database.types";

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
  const t = useT("massEmail");

  const saveToTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateId) throw new Error(t("composerNoTemplateError"));
      const client = createClient();
      return updateEmailTemplate(selectedTemplateId, { subject, body }, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(t("composerSaveSuccess"));
    },
    onError: (error: Error) => {
      toast.error(t("composerSaveError"), { description: error.message });
    },
  });

  const handleSaveToTemplate = () => {
    saveToTemplateMutation.mutate();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-1">
        <CardTitle>{t("composerCardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div>
          <Label className="mb-3">{t("composerTemplateLabel")}</Label>
          <div className="flex gap-3">
            <div className="flex-1">
              {templates.length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <p className="text-muted-foreground mb-4">{t("composerNoTemplates")}</p>
                  <Link href="/mass-email/templates">
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("composerCreateTemplate")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("composerTemplatePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl: EmailTemplate) => (
                      <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
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
                    {t("composerSaveToTemplate")}
                  </Button>
                )}
                <Link href="/mass-email/templates">
                  <Button variant="outline" className="h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("composerNewTemplate")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div>
          <Label className="mb-3">{t("composerSubjectLabel")}</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("composerSubjectPlaceholder")} />
        </div>

        <div>
          <Label className="mb-3">{t("composerBodyLabel")}</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder={t("composerBodyPlaceholder")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
