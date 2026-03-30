// src/app/mass-email/page.tsx
// This file defines the Mass Email page of the application, which allows users to send mass emails to selected contacts.
// The page includes a form for selecting contacts, choosing an email template, and composing the email subject and body.
// It uses React state to manage selected contacts, chosen template, email subject, and body content.
// The actual sending of emails is simulated with a timeout, and success/error feedback is provided using toast notifications.
// The contact list and email templates are currently hardcoded as empty arrays, but in a real application, they would be fetched from the server.

"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { Database } from "@/lib/supabase/database.types";

type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];

export default function MassEmailPage() {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // TODO: Fetch contacts and templates
  const contacts: { id: string; name: string; email: string }[] = [];
  const templates: EmailTemplate[] = [];

  const handleSend = async () => {
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }

    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in subject and body");
      return;
    }

    setIsSending(true);
    try {
      // TODO: Implement mass email sending
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
      toast.success(`Email sent to ${selectedContacts.length} contacts`);
      setSelectedContacts([]);
      setSubject("");
      setBody("");
    } catch (error) {
      toast.error("Failed to send emails", { description: String(error) });
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map((c) => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, contactId]);
    } else {
      setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject || "");
      setBody(template.body || "");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Mass Email</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all">Select All</Label>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={contact.id}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                    />
                    <Label htmlFor={contact.id} className="flex-1">
                      {contact.name} ({contact.email})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compose Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template">Email Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div>
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body"
                rows={10}
              />
            </div>

            <Button onClick={handleSend} disabled={isSending} className="w-full" type="button">
              {isSending ? "Sending..." : `Send to ${selectedContacts.length} contacts`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
