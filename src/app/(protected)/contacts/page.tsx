// src/app/contacts/page.tsx
// This file defines the Contacts page of the application, which displays a list of contacts and allows users to create, edit, and delete contacts.
// It uses React Query to fetch contact data from the server and manage state for creating, updating, and deleting contacts.
// The page includes a dialog for creating new contacts and editing existing ones, as well as a confirmation dialog for deletions.
// Each contact entry displays relevant information such as name, email, phone number, associated company, and whether it's a primary contact.
// The page also handles loading and error states, providing feedback to the user accordingly.

import { Suspense } from "react";
import { ContactsPageSkeleton } from "@/components/ui/page-list-skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientContactsPage from "./ClientContactsPage";

export default async function ContactsPage() {
  const _user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<ContactsPageSkeleton />}>
          <ClientContactsPage />
        </Suspense>
      </div>
    </div>
  );
}
