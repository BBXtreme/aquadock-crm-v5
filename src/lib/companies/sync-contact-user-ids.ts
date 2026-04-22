import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";

/** Bulk-set `user_id` (and `updated_by`) on active contacts linked to a company. */
export async function syncContactUserIdsForCompany(
  supabase: SupabaseClient,
  companyId: string,
  ownerUserId: string,
  actorUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("contacts")
    .update({ user_id: ownerUserId, updated_by: actorUserId })
    .eq("company_id", companyId)
    .is("deleted_at", null);
  if (error) throw handleSupabaseError(error, "syncContactUserIdsForCompany");
}
