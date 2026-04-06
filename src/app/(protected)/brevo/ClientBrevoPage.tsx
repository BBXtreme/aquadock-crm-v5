// src/app/(protected)/brevo/ClientBrevoPage.tsx
"use client";

import BrevoCampaignForm from "@/components/features/brevo/BrevoCampaignForm";
import BrevoCampaignList from "@/components/features/brevo/BrevoCampaignList";

export default function ClientBrevoPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Kampagne</h2>
        <BrevoCampaignForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Kampagnen in Brevo</h2>
        <BrevoCampaignList />
      </section>
    </div>
  );
}
