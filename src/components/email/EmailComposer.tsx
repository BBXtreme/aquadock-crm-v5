// src/components/email/EmailComposer.tsx
// Client Component for composing email content based on templates and providing a live preview of the email before sending.

"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EmailTemplate } from "@/lib/supabase/database.types";

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
  return (
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
  );
}
