import { createClient } from "@/lib/supabase/browser";
import { handleSupabaseError } from "@/lib/supabase/utils";

export async function getUserColumnOrder(): Promise<string[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("value")
    .eq("key", "companies_column_order")
    .single();

  if (error && error.code !== "PGRST116") throw handleSupabaseError(error, "getUserColumnOrder");
  return data?.value ?? null;
}

export async function saveUserColumnOrder(order: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("user_settings").upsert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    key: "companies_column_order",
    value: order,
  });

  if (error) throw handleSupabaseError(error, "saveUserColumnOrder");
}
