// src/app/(protected)/mass-email/page.tsx
// This file defines the Mass Email page of the application, which allows users to send mass emails to selected contacts.
// The page includes a form for selecting contacts, choosing an email template, and composing the email subject and body.
// It uses React state to manage selected contacts, chosen template, email subject, and body content.
// The actual sending of emails is simulated with a timeout, and success/error feedback is provided using toast notifications.
// The contact list and email templates are currently hardcoded as empty arrays, but in a real application, they would be fetched from the server.

import { Suspense } from "react";
import { requireAdmin } from "@/lib/supabase/auth/require-admin";
import { safeDisplay } from "@/lib/utils/data-format";
import ClientMassEmailPage from "./ClientMassEmailPage";

export default async function MassEmailPage() {
  const user = await requireAdmin();

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div>Welcome, {safeDisplay(user.display_name)}</div>
      <Suspense fallback={<div>Loading mass email...</div>}>
        <ClientMassEmailPage />
      </Suspense>
    </div>
  );
}
