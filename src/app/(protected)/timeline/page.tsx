// src/app/(protected)/timeline/page.tsx
// This file defines the Timeline page of the application, which displays a list of timeline entries related to companies and contacts.
// It uses React Query to fetch timeline data from the server and manage state for creating, updating, and deleting entries.
// The page includes a dialog for creating and editing timeline entries, as well as a confirmation dialog for deletions.
// Each timeline entry displays relevant information such as title, content, associated company/contact, creation time, and activity type with corresponding icons and colors.
// The page also handles loading and error states, providing feedback to the user accordingly.

import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth/require-user";
import { safeDisplay } from "@/lib/utils/data-format";
import ClientTimelinePage from "./ClientTimelinePage";

export default async function TimelinePage() {
  const user = await requireUser();

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div>Welcome, {safeDisplay(user.display_name)}</div>
      <Suspense fallback={<div>Loading timeline...</div>}>
        <ClientTimelinePage />
      </Suspense>
    </div>
  );
}
