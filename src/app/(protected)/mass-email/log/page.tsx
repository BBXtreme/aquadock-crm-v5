// src/app/(protected)/mass-email/log/page.tsx
// This file defines the EmailLogPage component, which displays a log of all sent emails in the application. It allows users to filter by status (sent or error) and search by recipient email or subject.

import type { EmailLog } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { requireUser } from "@/lib/supabase/server";
import ClientEmailLogPage from "./ClientEmailLogPage";

export default async function EmailLogPage() {
  await requireUser();

  const supabase = await createServerSupabaseClient();
  const { data: logs = [] } = await supabase.from("email_log").select("*").order("created_at", { ascending: false });

  return <ClientEmailLogPage logs={logs as EmailLog[]} />;
}
