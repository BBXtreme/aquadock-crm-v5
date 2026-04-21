import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { safeDisplay } from "@/lib/utils/data-format";
import type { Database } from "@/types/database.types";

export type TrashAuditEntity = "company" | "contact" | "reminder" | "timeline_row" | "comment";

export type TrashAuditOperation = "soft_delete" | "hard_delete" | "restore";

export type LogTrashAuditParams = {
  entity: TrashAuditEntity;
  operation: TrashAuditOperation;
  entityId: string;
  label: string | null;
  companyId: string | null;
  contactId: string | null;
  userId: string;
  profileId: string | null;
};

function operationLabel(op: TrashAuditOperation): string {
  if (op === "soft_delete") return "Papierkorb (soft delete)";
  if (op === "hard_delete") return "Endgültig gelöscht";
  return "Wiederhergestellt";
}

function entityLabel(entity: TrashAuditEntity): string {
  if (entity === "company") return "Unternehmen";
  if (entity === "contact") return "Kontakt";
  if (entity === "reminder") return "Erinnerung";
  if (entity === "comment") return "Notiz";
  return "Aktivität";
}

async function resolveActorDisplayName(
  supabase: SupabaseClient<Database>,
  profileId: string | null,
): Promise<string> {
  if (profileId === null) {
    return "Unbekannt";
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "resolveActorDisplayName");

  const raw = data?.display_name;
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return "Unbekannt";
  }
  return safeDisplay(raw);
}

function buildAuditTitle(
  entity: TrashAuditEntity,
  operation: TrashAuditOperation,
  actorDisplay: string,
): string {
  if (operation === "soft_delete") {
    if (entity === "company") {
      return `Firma in Papierkorb verschoben von ${actorDisplay}`;
    }
    if (entity === "contact") {
      return `Kontakt in Papierkorb verschoben von ${actorDisplay}`;
    }
    if (entity === "reminder") {
      return `Erinnerung in Papierkorb verschoben von ${actorDisplay}`;
    }
    if (entity === "comment") {
      return `Notiz in Papierkorb verschoben von ${actorDisplay}`;
    }
    return `Aktivität in Papierkorb verschoben von ${actorDisplay}`;
  }

  return `${entityLabel(entity)}: ${operationLabel(operation)} (von ${actorDisplay})`;
}

/**
 * Inserts a timeline row for trash / restore audit (activity_type "other").
 */
export async function logTrashAuditEvent(
  supabase: SupabaseClient<Database>,
  params: LogTrashAuditParams,
): Promise<void> {
  const actorDisplay = await resolveActorDisplayName(supabase, params.profileId);
  const title = buildAuditTitle(params.entity, params.operation, actorDisplay);
  const contentParts = [`ID: ${params.entityId}`];
  if (params.label !== null && params.label !== undefined && String(params.label).trim() !== "") {
    contentParts.push(`Bezeichnung: ${safeDisplay(params.label)}`);
  }
  const content = contentParts.join("\n");

  const { error } = await supabase.from("timeline").insert({
    title,
    content,
    activity_type: "other",
    company_id: params.companyId,
    contact_id: params.contactId,
    user_id: params.userId,
    created_by: params.profileId,
    updated_by: params.profileId,
    user_name: null,
    deleted_at: null,
  });

  if (error) throw handleSupabaseError(error, "logTrashAuditEvent");
}
