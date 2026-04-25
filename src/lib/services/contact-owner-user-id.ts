// Shared: resolve contact owner user_id from company row (RLS-scoped client).

import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";

export async function resolveContactOwnerUserId(
  supabase: SupabaseClient,
  companyId: string | null | undefined,
  currentUserId: string,
): Promise<string> {
  if (companyId == null || companyId === "") {
    return currentUserId;
  }
  const { data, error } = await supabase
    .from("companies")
    .select("user_id")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveContactOwnerUserId");

  const ownerId = data?.user_id;
  if (ownerId != null && ownerId !== "") {
    return ownerId;
  }
  return currentUserId;
}
