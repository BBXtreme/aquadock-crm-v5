"use server";

import { revalidateTag } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { aiModelInsertSchema, aiModelUpdateSchema } from "@/lib/validations/ai-model";

export type AiAvailableModelRow = {
  id: string;
  gateway_id: string;
  label: string;
  provider: string;
  quality_score: number;
  speed_tier: "low" | "medium" | "high";
  cost_tier: "low" | "medium" | "high";
  badge_text: string | null;
  badge_variant: "default" | "secondary" | "outline" | null;
  recommended_for: readonly string[];
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deprecated?: boolean;
};

async function requireAdmin(): Promise<void> {
  const _user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: isAdmin, error } = await supabase.rpc("is_app_admin");
  if (error) throw handleSupabaseError(error, "requireAdmin");
  if (!isAdmin) {
    throw new Error("Forbidden: admin only");
  }
  return;
}

export async function listAiModelsAction(): Promise<AiAvailableModelRow[]> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ai_available_models")
    .select("*")
    .order("created_at", { ascending: false });

  // Graceful fallback if table doesn't exist yet (migration not applied)
  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
      console.warn("[ai-models] Table ai_available_models not found — returning empty list (migration pending)");
      return [];
    }
    throw handleSupabaseError(error, "listAiModelsAction");
  }

  return (data ?? []) as AiAvailableModelRow[];
}

export async function createAiModelAction(input: unknown): Promise<AiAvailableModelRow> {
  await requireAdmin();
  const parsed = aiModelInsertSchema.parse(input);
  const supabase = await createServerSupabaseClient();
  const user = await requireUser();

  const { data, error } = await supabase
    .from("ai_available_models")
    .insert({
      ...parsed,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw handleSupabaseError(error, "createAiModelAction");
  revalidateTag("ai-models", "default");
  return data as AiAvailableModelRow;
}

export async function updateAiModelAction(id: string, patch: unknown): Promise<AiAvailableModelRow> {
  await requireAdmin();
  const parsed = aiModelUpdateSchema.parse(patch);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ai_available_models")
    .update(parsed)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw handleSupabaseError(error, "updateAiModelAction");
  revalidateTag("ai-models", "default");
  return data as AiAvailableModelRow;
}

export async function deleteAiModelAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("ai_available_models").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteAiModelAction");
  revalidateTag("ai-models", "default");
}