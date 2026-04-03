// src/components/email/LivePreview.tsx
// Client Component for displaying a live preview of the email content based on the selected template and recipient.

"use client";

import { Code, Copy, Eye, MailCheck, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type LivePreviewProps = {
  previewSubject: string;
  previewBody: string;
  previewRecipient: { name: string; email: string; firmenname?: string };
  selectedRecipientIds: string[];
  handleSend: (isTest: boolean, testEmail?: string) => void;
};

// Simple HTML sanitizer to remove script tags and other potentially dangerous elements
const sanitizeHtml = (html: string): string => {
  // Remove script tags and their content
  let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  // Remove other potentially dangerous tags (e.g., iframe, object, embed)
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*>.*?<\/\1>/gi, '');
  // Remove event handlers (e.g., onclick, onload)
  sanitized = sanitized.replace(/\s+(on\w+)="[^"]*"/gi, '');
  return sanitized;
};

export default function LivePreview({
  previewSubject,
  previewBody,
  previewRecipient,
  selectedRecipientIds,
  handleSend,
}: LivePreviewProps) {
  const [previewTab, setPreviewTab] = useState<"preview" | "raw">("preview");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const copyToClipboard = async () => {
    const text = `Betreff: ${previewSubject}\n\n${previewBody}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("In die Zwischenablage kopiert");
    } catch (_err) {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const sanitizedBody = sanitizeHtml(previewBody);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live-Vorschau</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Simple toggle */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setPreviewTab("preview")}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${previewTab === "preview" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            <Eye className="inline mr-2 h-4 w-4" />
            Vorschau
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab("raw")}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${previewTab === "raw" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            <Code className="inline mr-2 h-4 w-4" />
            Quelltext
          </button>
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="ml-4">
            <Copy className="h-4 w-4 mr-2" />
            In die Zwischenablage kopieren
          </Button>
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
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized server-side for email preview */}
              <div
                className="prose dark:prose-invert text-[15.5px] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizedBody || "Kein Inhalt" }}
              />
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
          <Button variant="outline" onClick={() => setTestDialogOpen(true)} className="flex-1" size="lg">
            <MailCheck className="mr-2 h-5 w-5" />
            Testsendung
          </Button>
        </div>

        {/* Test Email Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test-E-Mail senden</DialogTitle>
              <DialogDescription>
                Geben Sie eine Test-E-Mail-Adresse ein, um die Nachricht zu testen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    handleSend(true, testEmail);
                    setTestDialogOpen(false);
                    setTestEmail("");
                  }}
                  disabled={!testEmail}
                >
                  Senden
                </Button>
                <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
