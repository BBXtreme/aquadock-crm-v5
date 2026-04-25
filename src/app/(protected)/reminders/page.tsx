// src/app/(protected)/reminders/page.tsx
// This file defines the Reminders page of the application, which displays a list of reminders and allows users to create, edit, and delete reminders.
// It uses React Query to fetch reminder data from the server and manage state for creating, updating, and deleting reminders.
// The page includes a dialog for creating and editing reminders, as well as a confirmation dialog for deletions.
// Each reminder displays relevant information such as title, description, due date, priority, status, and assigned user.
// The page also handles loading and error states, providing feedback to the user accordingly.

import { Suspense } from "react";
import ClientRemindersPage from "@/components/features/reminders/ClientRemindersPage";
import { RemindersPageSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function RemindersPage() {
  const _user = await requireUser();

  return (
    <PageShell>
      <Suspense fallback={<RemindersPageSkeleton />}>
        <ClientRemindersPage />
      </Suspense>
    </PageShell>
  );
}
