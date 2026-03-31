// src/app/(protected)/mass-email/templates/page.tsx
// This file defines the TemplatesPage component, a professional page for managing email templates.
// It uses a server component for authentication and a client component for interactivity.

import { requireUser } from "@/lib/supabase/auth/require-user";
import TemplatesClient from "./TemplatesClient";

export default async function TemplatesPage() {
  await requireUser();

  return <TemplatesClient />;
}
