// src/app/(protected)/brevo/page.tsx
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ClientBrevoPage from "./ClientBrevoPage";

export default async function BrevoPage() {
  const _user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: templates } = await supabase
    .from("email_templates")
    .select("*");

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Brevo Campaigns</h1>
          <p className="text-muted-foreground">Manage newsletters and email campaigns via Brevo</p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ClientBrevoPage templates={templates || []} />
        </Suspense>
      </div>
    </div>
  );
}
