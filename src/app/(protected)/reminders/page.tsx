// src/app/(protected)/reminders/page.tsx
// This file defines the Reminders page of the application, which displays a list of reminders and allows users to create, edit, and delete reminders.
// It uses React Query to fetch reminder data from the server and manage state for creating, updating, and deleting reminders.
// The page includes a dialog for creating and editing reminders, as well as a confirmation dialog for deletions.
// Each reminder displays relevant information such as title, description, due date, priority, status, and assigned user.
// The page also handles loading and error states, providing feedback to the user accordingly.

import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth/require-user";
import { safeDisplay } from "@/lib/utils/data-format";
import ClientRemindersPage from "./ClientRemindersPage";

export default async function RemindersPage() {
  const user = await requireUser();

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div>Welcome, {safeDisplay(user.display_name)}</div>
      <Suspense fallback={<div>Loading reminders...</div>}>
        <ClientRemindersPage />
      </Suspense>
    </div>
  );
}
