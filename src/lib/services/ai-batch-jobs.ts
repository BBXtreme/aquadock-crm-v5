/**
 * Persistence for async AI batch jobs (`ai_batch_jobs`).
 * Submitting work to xAI Batch and merging results is implemented in the worker route;
 * this module keeps inserts/updates small and RLS-safe for the user session.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { AiBatchJobInsertPayload } from "@/lib/validations/ai-batch-job";
import { aiBatchJobInsertPayloadSchema } from "@/lib/validations/ai-batch-job";
import type { Database } from "@/types/supabase";

export async function insertAiBatchJobForUser(
  client: SupabaseClient<Database>,
  userId: string,
  raw: AiBatchJobInsertPayload,
): Promise<{ id: string }> {
  const parsed = aiBatchJobInsertPayloadSchema.parse(raw);
  const insert: Database["public"]["Tables"]["ai_batch_jobs"]["Insert"] = {
    user_id: userId,
    job_type: parsed.job_type,
    status: "queued",
    payload: (parsed.payload ?? {}) as Database["public"]["Tables"]["ai_batch_jobs"]["Insert"]["payload"],
  };
  const { data, error } = await client.from("ai_batch_jobs").insert(insert).select("id").single();
  if (error) {
    throw handleSupabaseError(error, "insertAiBatchJobForUser");
  }
  if (!data?.id) {
    throw new Error("insertAiBatchJobForUser: missing id");
  }
  return { id: data.id };
}
