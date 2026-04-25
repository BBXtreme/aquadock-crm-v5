// src/app/contacts/page.tsx
// This file defines the Contacts page of the application, which displays a list of contacts and allows users to create, edit, and delete contacts.
// It uses React Query to fetch contact data from the server and manage state for creating, updating, and deleting contacts.
// The page includes a dialog for creating new contacts and editing existing ones, as well as a confirmation dialog for deletions.
// Each contact entry displays relevant information such as name, email, phone number, associated company, and whether it's a primary contact.
// The page also handles loading and error states, providing feedback to the user accordingly.

import { Suspense } from "react";
import ClientContactsPage from "@/components/features/contacts/ClientContactsPage";
import { ContactsPageSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function ContactsPage() {
  const _user = await requireUser();

  return (
    <PageShell>
      <Suspense fallback={<ContactsPageSkeleton />}>
        <ClientContactsPage />
      </Suspense>
    </PageShell>
  );
}
