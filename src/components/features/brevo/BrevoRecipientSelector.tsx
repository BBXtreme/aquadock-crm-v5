// src/components/features/brevo/BrevoRecipientSelector.tsx
"use client";

// Implement selector for companies/contacts, with filters
// Use Table from shadcn/ui, query via useQuery

export default function BrevoRecipientSelector({
  selectedRecipients,
  setSelectedRecipients,
}: {
  selectedRecipients: string[];
  setSelectedRecipients: (recipients: string[]) => void;
}) {
  return <div>Recipient Selector</div>;
}
