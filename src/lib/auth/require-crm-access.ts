// src/lib/auth/require-crm-access.ts
// Enforces CRM access: blocks onboarding applicants and soft-declined users from the protected shell.

import { redirect } from "next/navigation";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";
import type { AuthUser } from "./types";

/**
 * Gate for `(protected)` routes: session required, **not** pending approval, **not** declined (soft block).
 */
export const requireCrmAccess = cache(async (): Promise<AuthUser> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    redirect("/login");
  }

  const { data: pendingRow } = await supabase
    .from("pending_users")
    .select("status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (pendingRow !== null) {
    if (
      pendingRow.status === "pending_email_confirmation" ||
      pendingRow.status === "pending_review"
    ) {
      redirect("/access-pending");
    }
    if (pendingRow.status === "declined") {
      redirect("/access-denied");
    }
  }

  const u = await getCurrentUser();
  if (u === null) {
    redirect("/login");
  }
  return u;
});
