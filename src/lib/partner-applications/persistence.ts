import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PartnerApplicationSubmitInput } from "@/lib/validations/partner-application";
import { PARTNER_APPLICATION_DUPLICATE_BLOCK_STATUSES } from "@/lib/validations/partner-application";
import { PartnerApplicationCvError } from "./cv-errors";
import { finalizeCvStoragePath } from "./storage";

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function findDuplicateActiveApplication(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("partner_applications")
    .select("id")
    .eq("email", normalized)
    .in("status", [...PARTNER_APPLICATION_DUPLICATE_BLOCK_STATUSES])
    .gte("created_at", since)
    .limit(1);

  if (error != null) {
    throw new Error(error.message);
  }
  return (data?.length ?? 0) > 0;
}

export async function insertPartnerApplication(args: {
  input: PartnerApplicationSubmitInput;
  cvStoragePath: string | null;
  ip: string;
  userAgent: string | null;
}): Promise<{ id: string; cvStoragePath: string | null }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("partner_applications")
    .insert({
      locale: args.input.locale,
      first_name: args.input.firstName,
      last_name: args.input.lastName,
      email: args.input.email.trim().toLowerCase(),
      phone: args.input.phone,
      company_name: args.input.companyName?.trim() || null,
      country_code: args.input.countryCode,
      city_region: args.input.cityRegion,
      proposed_territory: args.input.proposedTerritory,
      years_sales_experience: args.input.yearsSalesExperience,
      industry_experience: args.input.industryExperience,
      motivation: args.input.motivation,
      cv_storage_path: null,
      linkedin_url: args.input.linkedinUrl?.trim() || null,
      references_text: args.input.referencesText?.trim() || null,
      tax_id: args.input.taxId?.trim() || null,
      handelsvertreter_ack: args.input.handelsvertreterAck,
      gdpr_consent: true,
      gdpr_consent_at: now,
      source: "website",
      ip_hash: hashIp(args.ip),
      user_agent: args.userAgent,
      status: "new",
    })
    .select("id")
    .single();

  if (error != null || data == null) {
    throw new Error(error?.message ?? "insert_failed");
  }

  let finalCvPath: string | null = null;
  try {
    finalCvPath = await finalizeCvStoragePath({
      applicationId: data.id,
      cvStoragePath: args.cvStoragePath,
    });
  } catch (e) {
    const { error: rollbackError } = await admin
      .from("partner_applications")
      .delete()
      .eq("id", data.id);
    if (rollbackError != null) {
      console.error("[partner-applications] rollback after cv failure", rollbackError.message);
    }
    throw e;
  }

  if (finalCvPath != null) {
    const { error: updateError } = await admin
      .from("partner_applications")
      .update({ cv_storage_path: finalCvPath })
      .eq("id", data.id);
    if (updateError != null) {
      console.error("[partner-applications] cv path update failed", updateError.message);
      await admin.from("partner_applications").delete().eq("id", data.id);
      throw new PartnerApplicationCvError("cv_update_failed", updateError.message);
    }
  }

  return { id: data.id, cvStoragePath: finalCvPath };
}

export function formatApplicationReferenceId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}
