// src/app/(protected)/brevo/ClientBrevoPage.tsx
"use client";

import BrevoCampaignForm from "@/components/features/brevo/BrevoCampaignForm";
import BrevoCampaignList from "@/components/features/brevo/BrevoCampaignList";

export default function ClientBrevoPage() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <section className="space-y-8" aria-labelledby="brevo-new-campaign-heading">
        <header className="border-b border-border/60 pb-6">
          <h2
            id="brevo-new-campaign-heading"
            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
          >
            Neue Kampagne
          </h2>
          <p className="mt-2 max-w-3xl text-muted-foreground leading-relaxed">
            Vorlagen wählen, Inhalt prüfen, Zielgruppe festlegen — anschließend an Brevo übermitteln.
          </p>
        </header>
        <BrevoCampaignForm />
      </section>

      <section className="space-y-6" aria-labelledby="brevo-campaign-list-heading">
        <header className="border-b border-border/60 pb-6">
          <h2 id="brevo-campaign-list-heading" className="text-xl font-semibold tracking-tight text-foreground">
            Kampagnen in Brevo
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Übersicht der zuletzt synchronisierten Kampagnen aus Ihrem Brevo-Konto.
          </p>
        </header>
        <BrevoCampaignList />
      </section>
    </div>
  );
}
