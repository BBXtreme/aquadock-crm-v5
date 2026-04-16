// src/app/(protected)/mass-email/page.tsx
// This file defines the Mass Email page of the application, which allows users to send mass emails to selected contacts.
// The page includes a form for selecting contacts, choosing an email template, and composing the email subject and body.
// It uses React state to manage selected contacts, chosen template, email subject, and body content.
// The actual sending of emails is simulated with a timeout, and success/error feedback is provided using toast notifications.
// The contact list and email templates are currently hardcoded as empty arrays, but in a real application, they would be fetched from the server.

import { Suspense } from "react";
import { MassEmailPageSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import ClientMassEmailPage from "./ClientMassEmailPage";

export default async function MassEmailPage() {
  await requireUser();

  return (
    <PageShell>
      <Suspense fallback={<MassEmailPageSkeleton />}>
        <ClientMassEmailPage />
      </Suspense>
    </PageShell>
  );
}
