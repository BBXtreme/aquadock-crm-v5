"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "sonner";
import { EmailTemplate, EmailLog } from "@/lib/supabase/types";
import { getEmailTemplates, getEmailLogs, createEmailLog } from "@/lib/supabase/services/email";

export default function MassEmailPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [history, setHistory] = useState<EmailLog[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch email templates
      const supabase = createClient();
      const templates = await getEmailTemplates(supabase);
      setTemplates(templates);

      // Fetch send history
      const history = await getEmailLogs(supabase);
      setHistory(history);
    };
    fetchData();
  }, []);

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

    setLoading(true);
    try {
      const supabase = createClient();
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) return;

      // Log test email
      await createEmailLog({
        recipient_email: "test@example.com",
        subject: template.subject,
        body: previewBody,
        status: "sent",
        sent_at: new Date().toISOString(),
      }, supabase);

      // Log to timeline
      await supabase.from("timeline").insert({
        company_id: null, // No specific company for mass email
        activity_type: "email",
        title: "Test Email Sent",
        content: `Test email sent to test@example.com`,
      });

      toast.success("Test email sent successfully!");
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToAll = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) return;

      // Fetch recipients based on filter
      let query = supabase.from("companies").select("firmenname");
      if (recipientFilter === "lead") {
        query = query.eq("status", "lead");
      } else if (recipientFilter === "won") {
        query = query.eq("status", "won");
      }
      // Add search filter if provided
      if (searchQuery) {
        query = query.ilike("firmenname", `%${searchQuery}%`);
      }

      const { data: companies, error } = await query;
      if (error) throw error;

      // For each company, send email (placeholder - just log)
      for (const company of companies || []) {
        const recipient = `contact@${company.firmenname.toLowerCase().replace(/\s+/g, "")}.com`;

        await createEmailLog({
          recipient_email: recipient,
          subject: template.subject,
          body: previewBody.replace(/{{firmenname}}/g, company.firmenname),
          status: "sent",
          sent_at: new Date().toISOString(),
        }, supabase);
      }

      // Log to timeline
      await supabase.from("timeline").insert({
        company_id: null,
        activity_type: "email",
        title: "Mass Email Sent",
        content: `Mass email sent to ${companies?.length || 0} recipients`,
      });

      toast.success(
        `Campaign queued for ${companies?.length || 0} recipients!`,
      );
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Failed to send mass email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Home {">"} Mass Email
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Mass Email
            </h1>
          </div>
          <Button className="bg-[#24BACC] hover:bg-[#1da0a8] text-white">
            New Campaign
          </Button>
        </div>

        <div className="space-y-4">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
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
                      <TableCell>
                        {template.body?.substring(0, 50)}...
                      </TableCell>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle>Send Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
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
                <Select
                  value={recipientFilter}
                  onValueChange={setRecipientFilter}
                >
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
                    disabled={!selectedTemplate || loading}
                    className="bg-[#24BACC] hover:bg-[#1da0a8] text-white"
                  >
                    Send Test
                  </Button>
                  <Button
                    onClick={handleSendToAll}
                    disabled={!selectedTemplate || loading}
                    className="bg-[#24BACC] hover:bg-[#1da0a8] text-white"
                  >
                    Send to All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {previewBody ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    Select a template to preview
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
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
    </AppLayout>
  );
}
