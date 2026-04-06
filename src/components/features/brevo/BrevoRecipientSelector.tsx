// src/components/features/brevo/BrevoRecipientSelector.tsx
"use client";

import { BrevoRecipientFilterBar } from "@/components/features/brevo/BrevoRecipientFilterBar";
import { BrevoRecipientIntro } from "@/components/features/brevo/BrevoRecipientIntro";
import { BrevoRecipientPager } from "@/components/features/brevo/BrevoRecipientPager";
import { BrevoRecipientTableView } from "@/components/features/brevo/BrevoRecipientTableView";
import { useBrevoRecipientContacts } from "@/components/features/brevo/use-brevo-recipient-contacts";
import { useBrevoRecipientFilters } from "@/components/features/brevo/use-brevo-recipient-filters";
import { useBrevoRecipientTable } from "@/components/features/brevo/use-brevo-recipient-table";

export default function BrevoRecipientSelector({
  setSelectedRecipients,
}: {
  setSelectedRecipients: (recipients: string[]) => void;
}) {
  const filters = useBrevoRecipientFilters();
  const { data: contacts = [], isPending } = useBrevoRecipientContacts();
  const table = useBrevoRecipientTable(contacts, filters, setSelectedRecipients);

  return (
    <div className="space-y-4">
      <BrevoRecipientIntro />
      <BrevoRecipientFilterBar
        globalFilter={filters.globalFilter}
        onGlobalFilterChange={filters.setGlobalFilter}
        kundentypValue={filters.kundentypValue}
        onKundentypChange={filters.setKundentypFilter}
        statusValue={filters.statusValue}
        onStatusChange={filters.setStatusFilter}
      />
      <BrevoRecipientTableView table={table} isPending={isPending} />
      <BrevoRecipientPager table={table} isPending={isPending} />
    </div>
  );
}
