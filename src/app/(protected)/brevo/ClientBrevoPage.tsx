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

  return (
    <div className="space-y-8">
      <BrevoCampaignForm />
      <BrevoRecipientSelector
        selectedRecipients={selectedRecipients}
        setSelectedRecipients={setSelectedRecipients}
      />
      <BrevoTemplateSelector templates={templates} />
      <BrevoCampaignList />
    </div>
  );
}
