// src/app/(protected)/brevo/ClientBrevoPage.tsx
"use client";

import { useState } from "react";
import BrevoCampaignForm from "@/components/features/brevo/BrevoCampaignForm";
import BrevoCampaignList from "@/components/features/brevo/BrevoCampaignList";
import BrevoRecipientSelector from "@/components/features/brevo/BrevoRecipientSelector";
import BrevoTemplateSelector from "@/components/features/brevo/BrevoTemplateSelector";
import type { Database } from "@/types/database.types";

interface ClientBrevoPageProps {
  templates: Database["public"]["Tables"]["email_templates"]["Row"][];
}

export default function ClientBrevoPage({ templates }: ClientBrevoPageProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Kampagne</h2>
        <BrevoCampaignForm selectedRecipients={selectedRecipients} selectedTemplate={selectedTemplate} />
        <BrevoRecipientSelector setSelectedRecipients={setSelectedRecipients} />
        <BrevoTemplateSelector templates={templates} value={selectedTemplate} onChange={setSelectedTemplate} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Kampagnen in Brevo</h2>
        <BrevoCampaignList />
      </section>
    </div>
  );
}
