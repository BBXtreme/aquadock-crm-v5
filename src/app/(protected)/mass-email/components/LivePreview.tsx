"use client";

import { useState } from "react";
import { Code, Eye, Send, TestTube } from "lucide-react";
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
              <div className="prose dark:prose-invert text-[15.5px] leading-relaxed whitespace-pre-wrap">
                {previewBody || "Kein Inhalt"}
              </div>
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
          <Button variant="outline" onClick={() => handleSend(true)} className="flex-1" size="lg">
            <TestTube className="mr-2 h-5 w-5" />
            Testsendung
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
