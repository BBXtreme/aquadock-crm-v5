// src/app/%28protected%29/mass-email/templates/page.tsx
// This file defines the TemplatesPage component, which is the main page for managing email templates in the mass email section of the application. It uses Suspense to load the TemplatesClient component, which handles the interactive parts of the templates management.
import { Suspense } from "react";
import TemplatesClient from "@/EmailTemplatesClient";
import { requireUser } from "@/lib/supabase/auth/require-user";

export default async function TemplatesPage() {
  await requireUser();

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <Suspense fallback={<div>Loading templates...</div>}>
        <TemplatesClient />
      </Suspense>
    </div>
  );
}
