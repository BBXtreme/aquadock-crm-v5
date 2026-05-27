"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { PARTNER_APPLICATION_STATUSES } from "@/lib/validations/partner-application";
import type { PartnerApplication, PartnerApplicationUpdate } from "@/types/database.types";

const applicationIdSchema = z.string().uuid();

const updateStatusSchema = z
  .object({
    id: applicationIdSchema,
    status: z.enum(PARTNER_APPLICATION_STATUSES),
    adminNotes: z.string().max(5000).optional(),
  })
  .strict();

export async function listPartnerApplications(): Promise<PartnerApplication[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("partner_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error !== null) {
    throw handleSupabaseError(error, "listPartnerApplications");
  }
  return data ?? [];
}

export async function getPartnerApplication(id: string): Promise<PartnerApplication | null> {
  await requireAdmin();
  const parsed = applicationIdSchema.safeParse(id);
  if (!parsed.success) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("partner_applications")
    .select("*")
    .eq("id", parsed.data)
    .maybeSingle();

  if (error !== null) {
    throw handleSupabaseError(error, "getPartnerApplication");
  }
  return data;
}

export async function updatePartnerApplicationStatus(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = updateStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const patch: PartnerApplicationUpdate = {
    status: parsed.data.status,
    ...(parsed.data.adminNotes !== undefined ? { admin_notes: parsed.data.adminNotes } : {}),
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("partner_applications")
    .update(patch)
    .eq("id", parsed.data.id);

  if (error !== null) {
    const e = handleSupabaseError(error, "updatePartnerApplicationStatus");
    return { ok: false, error: e.message };
  }
  return { ok: true };
}

export async function createPartnerApplicationCvSignedUrl(
  storagePath: string,
): Promise<string | null> {
  await requireAdmin();
  const path = storagePath.trim();
  if (path === "") return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("partner-applications")
    .createSignedUrl(path, 60 * 15);

  if (error !== null || data?.signedUrl == null) {
    return null;
  }
  return data.signedUrl;
}
