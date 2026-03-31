// src/app/(protected)/settings/page.tsx
// This file defines the Settings page of the application, where users can configure various settings related
// to notifications, appearance, OpenMap integration, and SMTP email configuration.

import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth/require-user";
import { safeDisplay } from "@/lib/utils/data-format";
import ClientSettingsPage from "./ClientSettingsPage";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div>Welcome, {safeDisplay(user.display_name)}</div>
      <Suspense fallback={<div>Loading settings...</div>}>
        <ClientSettingsPage />
      </Suspense>
    </div>
  );
}
