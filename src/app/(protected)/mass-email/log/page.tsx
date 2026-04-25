// src/app/(protected)/mass-email/log/page.tsx
// This file defines the EmailLogPage component, which displays a log of all sent emails in the application. It allows users to filter by status (sent or error) and search by recipient email or subject.

import { redirect } from "next/navigation";
import ClientEmailLogPage from "@/components/features/mass-email/ClientEmailLogPage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EmailLog } from "@/types/database.types";

export default async function EmailLogPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase.from("email_log").select("id, recipient_email, subject, status, sent_at, created_at, error_msg, recipient_name, mode, user_id, template_name").order("sent_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  const logs = data ?? [];

  return <ClientEmailLogPage logs={logs as EmailLog[]} />;
}
