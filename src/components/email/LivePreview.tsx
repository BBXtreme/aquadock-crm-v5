// src/components/email/LivePreview.tsx
// Client Component for displaying a live preview of the email content based on the selected template and recipient.

"use client";

import { Code, Copy, Eye, Send, TestTube } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type LivePreviewProps = {
  previewSubject: string;
  previewBody: string;
  previewRecipient: { name: string; email: string; firmenname?: string };
  selectedRecipientIds: string[];
  handleSend: (isTest: boolean) => void;
};

export default function LivePreview({
  previewSubject,
  previewBody,
  previewRecipient,
  selectedRecipientIds,
  handleSend,
}: LivePreviewProps) {
  const [previewTab, setPreviewTab] = useState<"preview" | "raw">("preview");

  const copyToClipboard = async () => {
    const text = `Betreff: ${previewSubject}\n\n${previewBody}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("In die Zwischenablage kopiert");
    } catch (_err) {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-6">
        <CardTitle>Live-Vorschau</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-8">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="ml-4 px-3 py-1 h-auto text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Kopieren
          </Button>
        </div>

        {/* Preview Content */}
        {previewTab === "preview" ? (
          <div className="border rounded-lg p-8 bg-white dark:bg-gray-900 min-h-[600px] shadow-lg mt-6">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Email header */}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 border-b pb-6">
                <div>
                  <span className="font-medium">Von:</span> AquaDock CRM &lt;no-reply@aquadock.de&gt;
                </div>
                <div>
                  <span className="font-medium">An:</span> {previewRecipient.name} &lt;{previewRecipient.email}&gt;
                </div>
              </div>

              {/* Subject */}
              <div className="font-bold text-xl leading-tight text-gray-900 dark:text-gray-100">
                {previewSubject || "Kein Betreff"}
              </div>

              {/* Body */}
              <div className="prose dark:prose-invert text-base leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {previewBody || "Kein Inhalt"}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="min-h-[600px] border rounded-lg p-8 bg-white dark:bg-gray-900 mt-6">
            <strong>Betreff:</strong> {previewSubject}
            <br /><br />
            <strong>Inhalt:</strong>
            <pre className="mt-6 whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200">{previewBody}</pre>
          </ScrollArea>
        )}

        <Separator className="my-8" />

        {/* Send buttons */}
        <div className="flex gap-4">
          <Button onClick={() => handleSend(false)} disabled={selectedRecipientIds.length === 0} className="flex-1" size="lg">
            <Send className="mr-2 h-5 w-5" />
            Senden ({selectedRecipientIds.length})
          </Button>
          <Button variant="outline" onClick={() => handleSend(true)} className="flex-1" size="lg">
            <TestTube className="mr-2 h-5 w-5" />
            Testsendung
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
