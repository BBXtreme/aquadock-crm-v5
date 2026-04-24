// src/components/email/LivePreview.tsx
"use client";

import { Code, Copy, Eye, MailCheck, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/use-translations";

type LivePreviewProps = {
  previewSubject: string;
  previewBody: string;
  previewRecipient: { name: string; email: string; firmenname?: string };
  selectedRecipientIds: string[];
  handleSend: (isTest: boolean, testEmail?: string) => void;
};

// Enhanced sanitizer
const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<(iframe|object|embed|form|input|button|style)[^>]*>.*?<\/\1>/gi, '')
    .replace(/\s+(on\w+)="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
};

// Safe HTML to React converter for basic tags
const htmlToReact = (html: string): React.ReactNode[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstChild as Element;

  const convertNode = (node: Node, index: number): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const props: Record<string, string> = {};

      // Only allow safe attributes for links
      if (tagName === 'a') {
        const href = element.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:'))) {
          props.href = href;
        }
        props.target = '_blank';
        props.rel = 'noopener noreferrer';
      }

      const children = Array.from(element.childNodes).map((child, i) => convertNode(child, i));

      switch (tagName) {
        case 'p':
          return <p key={index} className="mb-4">{children}</p>;
        case 'br':
          return <br key={index} />;
        case 'strong':
        case 'b':
          return <strong key={index}>{children}</strong>;
        case 'em':
        case 'i':
          return <em key={index}>{children}</em>;
        case 'ul':
          return <ul key={index} className="list-disc list-inside mb-4">{children}</ul>;
        case 'ol':
          return <ol key={index} className="list-decimal list-inside mb-4">{children}</ol>;
        case 'li':
          return <li key={index} className="mb-1">{children}</li>;
        case 'a':
          return <a key={index} {...props}>{children}</a>;
        case 'div':
          return <div key={index}>{children}</div>;
        case 'span':
          return <span key={index}>{children}</span>;
        default:
          // For unsupported tags, render as span
          return <span key={index}>{children}</span>;
      }
    }

    return null;
  };

  return Array.from(container.childNodes).map((node, index) => convertNode(node, index));
};

/** SSR-safe fallback when {@link DOMParser} is not available (server / first paint). */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function LivePreview({
  previewSubject,
  previewBody,
  previewRecipient,
  selectedRecipientIds,
  handleSend,
}: LivePreviewProps) {
  const t = useT("massEmail");
  const [previewTab, setPreviewTab] = useState<"preview" | "raw">("preview");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  /** Avoid `DOMParser` during SSR / RSC pass — it is not defined in Node. */
  const [canParseEmailHtml, setCanParseEmailHtml] = useState(false);
  useEffect(() => {
    setCanParseEmailHtml(true);
  }, []);

  const copyToClipboard = async () => {
    const text = `${t("livePreviewClipboardSubjectPrefix")} ${previewSubject}\n\n${previewBody}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("toastClipboardCopied"));
    } catch {
      toast.error(t("toastClipboardFailed"));
    }
  };

  const sanitizedBody = useMemo(() => sanitizeHtml(previewBody), [previewBody]);
  const bodyElements = useMemo(() => {
    if (!canParseEmailHtml) return null;
    return htmlToReact(sanitizedBody);
  }, [canParseEmailHtml, sanitizedBody]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("livePreviewCardTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={previewTab}
          onValueChange={(v) => setPreviewTab(v as "preview" | "raw")}
          className="mb-6 gap-0"
        >
          <div className="flex items-end gap-4 border-b">
            <TabsList
              variant="line"
              className="h-auto min-w-0 flex-1 justify-stretch rounded-none border-0 bg-transparent p-0"
            >
              <TabsTrigger value="preview" className="flex-1 gap-2 pb-3">
                <Eye className="h-4 w-4" />
                {t("livePreviewTabPreview")}
              </TabsTrigger>
              <TabsTrigger value="raw" className="flex-1 gap-2 pb-3">
                <Code className="h-4 w-4" />
                {t("livePreviewTabSource")}
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="mb-2 shrink-0">
              <Copy className="h-4 w-4 mr-2" />
              {t("livePreviewCopy")}
            </Button>
          </div>

          <TabsContent value="preview" className="mt-0 outline-none">
            <div className="border rounded-3xl p-8 bg-card min-h-[560px] shadow-sm">
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex justify-between text-xs text-muted-foreground border-b pb-4">
                  <div>
                    <span className="font-medium">{t("livePreviewFromLabel")}</span> AquaDock CRM &lt;no-reply@aquadock.de&gt;
                  </div>
                  <div>
                    <span className="font-medium">{t("livePreviewToLabel")}</span>{" "}
                    {`${previewRecipient.name} <${previewRecipient.email}>`}
                  </div>
                </div>

                <div className="font-bold text-2xl leading-tight">
                  {previewSubject || t("livePreviewNoSubject")}
                </div>

                {/* Safe HTML rendering as React elements */}
                <div className="prose dark:prose-invert text-[15.5px] leading-relaxed">
                  {!canParseEmailHtml ? (
                    sanitizedBody.trim() ? (
                      <div className="whitespace-pre-wrap">{stripHtmlToText(sanitizedBody)}</div>
                    ) : (
                      t("livePreviewNoBody")
                    )
                  ) : bodyElements && bodyElements.length > 0 ? (
                    bodyElements
                  ) : (
                    t("livePreviewNoBody")
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="raw" className="mt-0 outline-none">
            <ScrollArea className="min-h-[560px] border rounded-3xl p-8 bg-muted">
              <strong>{t("livePreviewRawSubject")}</strong> {previewSubject}
              <br /><br />
              <strong>{t("livePreviewRawBody")}</strong>
              <pre className="mt-6 whitespace-pre-wrap text-sm font-mono">{previewBody}</pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />

        <div className="flex gap-4">
          <Button 
            onClick={() => handleSend(false)} 
            disabled={selectedRecipientIds.length === 0} 
            className="flex-1" 
            size="lg"
          >
            <Send className="mr-2 h-5 w-5" />
            {t("livePreviewSendCount", { count: selectedRecipientIds.length })}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setTestDialogOpen(true)} 
            className="flex-1" 
            size="lg"
          >
            <MailCheck className="mr-2 h-5 w-5" />
            {t("livePreviewTestSend")}
          </Button>
        </div>

        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("testEmailDialogTitle")}</DialogTitle>
              <DialogDescription>{t("testEmailDialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder={t("testEmailPlaceholder")}
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
                  {t("testEmailSend")}
                </Button>
                <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                  {t("testEmailCancel")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
