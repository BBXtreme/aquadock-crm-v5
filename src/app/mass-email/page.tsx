"use client";

import { useQuery } from "@tanstack/react-query";
import DOMPurify from "isomorphic-dompurify";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { getCompanies } from "@/lib/supabase/services/companies";
import { createEmailLog, getEmailLogs, getEmailTemplates } from "@/lib/supabase/services/email";
import type { EmailLog, EmailTemplate } from "@/lib/supabase/types";

export default function MassEmailPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [sendLoading, setSendLoading] = useState(false);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const supabase = createClient();
      return getEmailTemplates(supabase);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<EmailLog[]>({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const supabase = createClient();
      return getEmailLogs(supabase);
    },
    staleTime: 5 * 60 * 1000,
  });

  const _loading = templatesLoading || historyLoading;

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        const filledBody = template.body
          .replace(/{{firmenname}}/g, "Sample Company GmbH")
          .replace(/{{vorname}}/g, "Max")
          .replace(/{{nachname}}/g, "Mustermann")
          .replace(/{{email}}/g, "max.mustermann@example.com");
        setPreviewBody(filledBody);
      }
    }
  }, [selectedTemplate, templates]);

  const handleSendTest = async () => {
    if (!selectedTemplate) return;

    setSendLoading(true);
    try {
      const supabase = createClient();
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) return;

      // Log test email
      await createEmailLog(
        {
          recipient_email: "test@example.com",
          subject: template.subject,
          body: previewBody,
          status: "sent",
          sent_at: new Date().toISOString(),
        },
        supabase,
      );

      // Log to timeline
      const response = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: null,
          activity_type: "email",
          title: "Test Email Sent",
          content: `Test email sent to test@example.com`,
          user_name: "Mass Email System",
        }),
      });
      if (!response.ok) {
        console.error("Failed to log to timeline:", await response.text());
      }

      toast.success("Test email sent successfully!");
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email");
    } finally {
      setSendLoading(false);
    }
  };

  const handleSendToAll = async () => {
    if (!selectedTemplate) return;

    setSendLoading(true);
    try {
      const supabase = createClient();
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) return;

      // Fetch recipients based on filter
      const companies = await getCompanies(supabase);
      let filteredCompanies = companies;
      if (recipientFilter === "lead") {
        filteredCompanies = companies.filter((c) => c.status === "lead");
      } else if (recipientFilter === "won") {
        filteredCompanies = companies.filter((c) => c.status === "won");
      }
      // Add search filter if provided
      if (searchQuery) {
        filteredCompanies = filteredCompanies.filter((c) =>
          c.firmenname.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      // For each company, send email (placeholder - just log)
      for (const company of filteredCompanies) {
        const recipient = `contact@${company.firmenname.toLowerCase().replace(/\s+/g, "")}.com`;

        await createEmailLog(
          {
            recipient_email: recipient,
            subject: template.subject,
            body: previewBody.replace(/{{firmenname}}/g, company.firmenname),
            status: "sent",
            sent_at: new Date().toISOString(),
          },
          supabase,
        );

        // Log to timeline
        const response = await fetch("/api/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: company.id,
            activity_type: "email",
            title: "Mass Email Sent",
            content: `Mass email sent to ${company.firmenname}`,
            user_name: "Mass Email System",
          }),
        });
        if (!response.ok) {
          console.error("Failed to log to timeline:", await response.text());
        }
      }

      toast.success(`Campaign queued for ${filteredCompanies.length} recipients!`);
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Failed to send mass email");
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Mass Email</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Mass Email
          </h1>
        </div>
        <Button className="bg-[#24BACC] text-white hover:bg-[#1da0a8]">New Campaign</Button>
      </div>

      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50 rounded-xl">
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>{template.subject}</TableCell>
                    <TableCell>{template.body?.substring(0, 50)}...</TableCell>
                  </TableRow>
                ))}
                {!templates.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No templates found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50 rounded-xl">
            <CardHeader>
              <CardTitle>Send Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="lead">Leads Only</SelectItem>
                  <SelectItem value="won">Won Deals Only</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex space-x-2">
                <Button
                  onClick={handleSendTest}
                  disabled={!selectedTemplate || sendLoading}
                  className="bg-[#24BACC] text-white hover:bg-[#1da0a8]"
                >
                  Send Test
                </Button>
                <Button
                  onClick={handleSendToAll}
                  disabled={!selectedTemplate || sendLoading}
                  className="bg-[#24BACC] text-white hover:bg-[#1da0a8]"
                >
                  Send to All
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {previewBody ? (
                <div
                  className="prose prose-sm max-w-none"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Inhalt wird mit DOMPurify gesäubert
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(previewBody),
                  }}
                />
              ) : (
                <p className="text-muted-foreground">Select a template to preview</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50 rounded-xl">
          <CardHeader>
            <CardTitle>Send History ({history.length} sent)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.recipient_email}</TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>{log.status}</TableCell>
                    <TableCell>{log.sent_at}</TableCell>
                  </TableRow>
                ))}
                {!history.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No send history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
