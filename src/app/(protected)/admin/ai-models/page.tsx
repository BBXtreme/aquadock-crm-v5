// src/app/(protected)/admin/ai-models/page.tsx
// Admin-only page to manage the Dynamic Model Registry (Phase 2).

import { redirect } from "next/navigation";
import { AiModelsAdminTable } from "@/components/features/admin/AiModelsAdminTable";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AiModelsAdminPage() {
  const _user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: isAdmin } = await supabase.rpc("is_app_admin");

  if (!isAdmin) {
    redirect("/settings");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">KI-Modell-Registry</h1>
        <p className="max-w-2xl text-muted-foreground">
          Verwalte die verfügbaren Modelle für die KI-Anreicherung. Änderungen sind sofort für alle Benutzer sichtbar.
          Die Registry wird serverseitig gecached und bei jeder Änderung invalidiert.
        </p>
      </div>
      <AiModelsAdminTable />
    </div>
  );
}