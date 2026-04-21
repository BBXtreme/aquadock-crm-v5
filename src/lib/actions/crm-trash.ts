"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import { TIMELINE_DELETE_NO_ACTIVE_ROW } from "@/lib/constants/timeline-delete";
import { logTrashAuditEvent } from "@/lib/server/delete-audit";
import { fetchTrashBinPreference } from "@/lib/services/user-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type DbClient = SupabaseClient<Database>;

export type TrashDeleteMode = "soft" | "hard";

/** Loads row metadata for trash audit; write access is enforced by RLS on update/delete. */
async function loadCompanyRowMetaForTrash(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  companyId: string,
): Promise<{ firmenname: string }> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, firmenname")
    .eq("id", companyId)
    .single();

  if (error) throw handleSupabaseError(error, "loadCompanyRowMetaForTrash");
  return { firmenname: data.firmenname };
}

async function hardDeleteCompanyCascade(
  supabase: DbClient,
  companyId: string,
): Promise<void> {
  const { data: contactRows, error: cErr } = await supabase.from("contacts").select("id").eq("company_id", companyId);
  if (cErr) throw handleSupabaseError(cErr, "hardDeleteCompanyCascade:contacts");

  const contactIds = (contactRows ?? []).map((r) => r.id);
  if (contactIds.length > 0) {
    const { error: t1 } = await supabase.from("timeline").update({ contact_id: null }).in("contact_id", contactIds);
    if (t1) throw handleSupabaseError(t1, "hardDeleteCompanyCascade:timelineContact");
  }

  const { error: t2 } = await supabase.from("timeline").update({ company_id: null }).eq("company_id", companyId);
  if (t2) throw handleSupabaseError(t2, "hardDeleteCompanyCascade:timelineCompany");

  const { error: rDel } = await supabase.from("reminders").delete().eq("company_id", companyId);
  if (rDel) throw handleSupabaseError(rDel, "hardDeleteCompanyCascade:reminders");

  const { error: coDel } = await supabase.from("contacts").delete().eq("company_id", companyId);
  if (coDel) throw handleSupabaseError(coDel, "hardDeleteCompanyCascade:contactsDelete");

  const { error: compDel } = await supabase.from("companies").delete().eq("id", companyId);
  if (compDel) throw handleSupabaseError(compDel, "hardDeleteCompanyCascade:company");
}

export async function deleteCompanyWithTrash(id: string): Promise<TrashDeleteMode> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { trashBinEnabled } = await fetchTrashBinPreference(supabase, user.id);

  const { firmenname } = await loadCompanyRowMetaForTrash(supabase, id);

  const { data: activeRow, error: activeErr } = await supabase
    .from("companies")
    .select("id, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (activeErr) throw handleSupabaseError(activeErr, "deleteCompanyWithTrash:active");
  if (!activeRow) {
    throw new Error("Unternehmen nicht gefunden oder bereits im Papierkorb");
  }

  const now = new Date().toISOString();

  if (trashBinEnabled) {
    const { error: u1 } = await supabase
      .from("companies")
      .update({ deleted_at: now, deleted_by: user.id })
      .eq("id", id);
    if (u1) throw handleSupabaseError(u1, "deleteCompanyWithTrash:softCompany");

    const { error: u2 } = await supabase
      .from("contacts")
      .update({ deleted_at: now, deleted_by: user.id })
      .eq("company_id", id);
    if (u2) throw handleSupabaseError(u2, "deleteCompanyWithTrash:softContacts");

    const { error: u3 } = await supabase
      .from("reminders")
      .update({ deleted_at: now, deleted_by: user.id })
      .eq("company_id", id);
    if (u3) throw handleSupabaseError(u3, "deleteCompanyWithTrash:softReminders");

    await logTrashAuditEvent(supabase, {
      entity: "company",
      operation: "soft_delete",
      entityId: id,
      label: firmenname,
      companyId: id,
      contactId: null,
      userId: user.id,
      profileId: user.id,
    });
    return "soft";
  }

  await hardDeleteCompanyCascade(supabase, id);
  await logTrashAuditEvent(supabase, {
    entity: "company",
    operation: "hard_delete",
    entityId: id,
    label: firmenname,
    companyId: null,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
  return "hard";
}

export async function restoreCompanyWithTrash(id: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: row, error: fetchErr } = await supabase
    .from("companies")
    .select("firmenname, deleted_at")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fetchErr) throw handleSupabaseError(fetchErr, "restoreCompanyWithTrash");
  if (!row) {
    throw new Error("Unternehmen nicht im Papierkorb");
  }

  const { error: u1 } = await supabase
    .from("companies")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (u1) throw handleSupabaseError(u1, "restoreCompanyWithTrash:company");

  const { error: u2 } = await supabase
    .from("contacts")
    .update({ deleted_at: null, deleted_by: null })
    .eq("company_id", id);
  if (u2) throw handleSupabaseError(u2, "restoreCompanyWithTrash:contacts");

  const { error: u3 } = await supabase
    .from("reminders")
    .update({ deleted_at: null, deleted_by: null })
    .eq("company_id", id);
  if (u3) throw handleSupabaseError(u3, "restoreCompanyWithTrash:reminders");

  await logTrashAuditEvent(supabase, {
    entity: "company",
    operation: "restore",
    entityId: id,
    label: row.firmenname,
    companyId: id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

export async function permanentlyDeleteCompany(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fetchErr } = await supabase
    .from("companies")
    .select("firmenname")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fetchErr) throw handleSupabaseError(fetchErr, "permanentlyDeleteCompany");
  if (!row) {
    throw new Error("Unternehmen nicht im Papierkorb");
  }

  const label = row.firmenname;
  await hardDeleteCompanyCascade(supabase, id);

  await logTrashAuditEvent(supabase, {
    entity: "company",
    operation: "hard_delete",
    entityId: id,
    label,
    companyId: null,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

/** Admin-only: restore any trashed company and its cascaded contacts/reminders. */
export async function adminRestoreCompany(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fetchErr } = await supabase
    .from("companies")
    .select("firmenname")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fetchErr) throw handleSupabaseError(fetchErr, "adminRestoreCompany");
  if (!row) {
    throw new Error("Unternehmen nicht im Papierkorb");
  }

  const { error: u1 } = await supabase
    .from("companies")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (u1) throw handleSupabaseError(u1, "adminRestoreCompany:company");

  const { error: u2 } = await supabase
    .from("contacts")
    .update({ deleted_at: null, deleted_by: null })
    .eq("company_id", id);
  if (u2) throw handleSupabaseError(u2, "adminRestoreCompany:contacts");

  const { error: u3 } = await supabase
    .from("reminders")
    .update({ deleted_at: null, deleted_by: null })
    .eq("company_id", id);
  if (u3) throw handleSupabaseError(u3, "adminRestoreCompany:reminders");

  await logTrashAuditEvent(supabase, {
    entity: "company",
    operation: "restore",
    entityId: id,
    label: row.firmenname,
    companyId: id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

async function assertContactWritable(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  contactId: string,
  userId: string,
): Promise<{ vorname: string; nachname: string; company_id: string | null }> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, vorname, nachname, user_id, company_id")
    .eq("id", contactId)
    .single();

  if (error) throw handleSupabaseError(error, "assertContactWritable");
  const owner = data.user_id;
  if (owner !== null && owner !== userId) {
    throw new Error("Keine Berechtigung für diesen Kontakt");
  }
  return { vorname: data.vorname, nachname: data.nachname, company_id: data.company_id };
}

export async function deleteContactWithTrash(id: string): Promise<TrashDeleteMode> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { trashBinEnabled } = await fetchTrashBinPreference(supabase, user.id);
  const meta = await assertContactWritable(supabase, id, user.id);
  const label = `${meta.vorname} ${meta.nachname}`.trim();

  const { data: activeRow, error: activeErr } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (activeErr) throw handleSupabaseError(activeErr, "deleteContactWithTrash:active");
  if (!activeRow) {
    throw new Error("Kontakt nicht gefunden oder bereits im Papierkorb");
  }

  if (trashBinEnabled) {
    const { error } = await supabase
      .from("contacts")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", id);
    if (error) throw handleSupabaseError(error, "deleteContactWithTrash:soft");

    await logTrashAuditEvent(supabase, {
      entity: "contact",
      operation: "soft_delete",
      entityId: id,
      label,
      companyId: meta.company_id,
      contactId: id,
      userId: user.id,
      profileId: user.id,
    });
    return "soft";
  }

  const { error: t0 } = await supabase.from("timeline").update({ contact_id: null }).eq("contact_id", id);
  if (t0) throw handleSupabaseError(t0, "deleteContactWithTrash:timeline");

  const { error: del } = await supabase.from("contacts").delete().eq("id", id);
  if (del) throw handleSupabaseError(del, "deleteContactWithTrash:hard");

  await logTrashAuditEvent(supabase, {
    entity: "contact",
    operation: "hard_delete",
    entityId: id,
    label,
    companyId: meta.company_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
  return "hard";
}

export async function restoreContactWithTrash(id: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const meta = await assertContactWritable(supabase, id, user.id);
  const label = `${meta.vorname} ${meta.nachname}`.trim();

  const { data: trashed, error: fe } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "restoreContactWithTrash");
  if (!trashed) throw new Error("Kontakt nicht im Papierkorb");

  const { error } = await supabase.from("contacts").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) throw handleSupabaseError(error, "restoreContactWithTrash:update");

  await logTrashAuditEvent(supabase, {
    entity: "contact",
    operation: "restore",
    entityId: id,
    label,
    companyId: meta.company_id,
    contactId: id,
    userId: user.id,
    profileId: user.id,
  });
}

export async function permanentlyDeleteContact(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("contacts")
    .select("id, vorname, nachname, company_id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "permanentlyDeleteContact");
  if (!row) throw new Error("Kontakt nicht im Papierkorb");

  const label = `${row.vorname} ${row.nachname}`.trim();

  const { error: t0 } = await supabase.from("timeline").update({ contact_id: null }).eq("contact_id", id);
  if (t0) throw handleSupabaseError(t0, "permanentlyDeleteContact:timeline");

  const { error: del } = await supabase.from("contacts").delete().eq("id", id);
  if (del) throw handleSupabaseError(del, "permanentlyDeleteContact:delete");

  await logTrashAuditEvent(supabase, {
    entity: "contact",
    operation: "hard_delete",
    entityId: id,
    label,
    companyId: row.company_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

export async function adminRestoreContact(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("contacts")
    .select("id, vorname, nachname, company_id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "adminRestoreContact");
  if (!row) throw new Error("Kontakt nicht im Papierkorb");

  const label = `${row.vorname} ${row.nachname}`.trim();

  const { error } = await supabase.from("contacts").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) throw handleSupabaseError(error, "adminRestoreContact:update");

  await logTrashAuditEvent(supabase, {
    entity: "contact",
    operation: "restore",
    entityId: id,
    label,
    companyId: row.company_id,
    contactId: id,
    userId: user.id,
    profileId: user.id,
  });
}

async function assertReminderWritable(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  reminderId: string,
  userId: string,
): Promise<{ title: string; company_id: string }> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id, title, user_id, company_id")
    .eq("id", reminderId)
    .single();

  if (error) throw handleSupabaseError(error, "assertReminderWritable");
  const owner = data.user_id;
  if (owner !== null && owner !== userId) {
    throw new Error("Keine Berechtigung für diese Erinnerung");
  }
  return { title: data.title, company_id: data.company_id };
}

export async function deleteReminderWithTrash(id: string): Promise<TrashDeleteMode> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { trashBinEnabled } = await fetchTrashBinPreference(supabase, user.id);
  const meta = await assertReminderWritable(supabase, id, user.id);

  const { data: activeRow, error: activeErr } = await supabase
    .from("reminders")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (activeErr) throw handleSupabaseError(activeErr, "deleteReminderWithTrash:active");
  if (!activeRow) {
    throw new Error("Erinnerung nicht gefunden oder bereits im Papierkorb");
  }

  if (trashBinEnabled) {
    const { error } = await supabase
      .from("reminders")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", id);
    if (error) throw handleSupabaseError(error, "deleteReminderWithTrash:soft");

    await logTrashAuditEvent(supabase, {
      entity: "reminder",
      operation: "soft_delete",
      entityId: id,
      label: meta.title,
      companyId: meta.company_id,
      contactId: null,
      userId: user.id,
      profileId: user.id,
    });
    return "soft";
  }

  const { error: del } = await supabase.from("reminders").delete().eq("id", id);
  if (del) throw handleSupabaseError(del, "deleteReminderWithTrash:hard");

  await logTrashAuditEvent(supabase, {
    entity: "reminder",
    operation: "hard_delete",
    entityId: id,
    label: meta.title,
    companyId: meta.company_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
  return "hard";
}

export async function restoreReminderWithTrash(id: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const meta = await assertReminderWritable(supabase, id, user.id);

  const { data: trashed, error: fe } = await supabase
    .from("reminders")
    .select("id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "restoreReminderWithTrash");
  if (!trashed) throw new Error("Erinnerung nicht im Papierkorb");

  const { error } = await supabase.from("reminders").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) throw handleSupabaseError(error, "restoreReminderWithTrash:update");

  await logTrashAuditEvent(supabase, {
    entity: "reminder",
    operation: "restore",
    entityId: id,
    label: meta.title,
    companyId: meta.company_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

export async function permanentlyDeleteReminder(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("reminders")
    .select("id, title, company_id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "permanentlyDeleteReminder");
  if (!row) throw new Error("Erinnerung nicht im Papierkorb");

  const { error: del } = await supabase.from("reminders").delete().eq("id", id);
  if (del) throw handleSupabaseError(del, "permanentlyDeleteReminder:delete");

  await logTrashAuditEvent(supabase, {
    entity: "reminder",
    operation: "hard_delete",
    entityId: id,
    label: row.title,
    companyId: row.company_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

export async function adminRestoreReminder(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("reminders")
    .select("id, title, company_id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "adminRestoreReminder");
  if (!row) throw new Error("Erinnerung nicht im Papierkorb");

  const { error } = await supabase.from("reminders").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) throw handleSupabaseError(error, "adminRestoreReminder:update");

  await logTrashAuditEvent(supabase, {
    entity: "reminder",
    operation: "restore",
    entityId: id,
    label: row.title,
    companyId: row.company_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

/** Loads row metadata for trash audit; write access is enforced by RLS on update/delete. */
async function loadTimelineRowMetaForTrash(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  entryId: string,
): Promise<{ title: string; company_id: string | null; contact_id: string | null }> {
  const { data, error } = await supabase
    .from("timeline")
    .select("id, title, company_id, contact_id")
    .eq("id", entryId)
    .single();

  if (error) throw handleSupabaseError(error, "loadTimelineRowMetaForTrash");

  return { title: data.title, company_id: data.company_id, contact_id: data.contact_id };
}

export async function deleteTimelineEntryWithTrash(id: string): Promise<TrashDeleteMode> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { trashBinEnabled } = await fetchTrashBinPreference(supabase, user.id);
  const meta = await loadTimelineRowMetaForTrash(supabase, id);

  const { data: activeRow, error: activeErr } = await supabase
    .from("timeline")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (activeErr) throw handleSupabaseError(activeErr, "deleteTimelineEntryWithTrash:active");
  if (!activeRow) {
    throw new Error(TIMELINE_DELETE_NO_ACTIVE_ROW);
  }

  if (trashBinEnabled) {
    const { error } = await supabase
      .from("timeline")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq("id", id);
    if (error) throw handleSupabaseError(error, "deleteTimelineEntryWithTrash:soft");

    await logTrashAuditEvent(supabase, {
      entity: "timeline_row",
      operation: "soft_delete",
      entityId: id,
      label: meta.title,
      companyId: meta.company_id,
      contactId: meta.contact_id,
      userId: user.id,
      profileId: user.id,
    });
    return "soft";
  }

  const { error: del } = await supabase.from("timeline").delete().eq("id", id);
  if (del) throw handleSupabaseError(del, "deleteTimelineEntryWithTrash:hard");

  await logTrashAuditEvent(supabase, {
    entity: "timeline_row",
    operation: "hard_delete",
    entityId: id,
    label: meta.title,
    companyId: meta.company_id,
    contactId: meta.contact_id,
    userId: user.id,
    profileId: user.id,
  });
  return "hard";
}

export async function restoreTimelineEntryWithTrash(id: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const meta = await loadTimelineRowMetaForTrash(supabase, id);

  const { data: trashed, error: fe } = await supabase
    .from("timeline")
    .select("id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "restoreTimelineEntryWithTrash");
  if (!trashed) throw new Error("Eintrag nicht im Papierkorb");

  const { error } = await supabase.from("timeline").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) throw handleSupabaseError(error, "restoreTimelineEntryWithTrash:update");

  await logTrashAuditEvent(supabase, {
    entity: "timeline_row",
    operation: "restore",
    entityId: id,
    label: meta.title,
    companyId: meta.company_id,
    contactId: meta.contact_id,
    userId: user.id,
    profileId: user.id,
  });
}

export async function permanentlyDeleteTimelineEntry(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("timeline")
    .select("id, title, company_id, contact_id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "permanentlyDeleteTimelineEntry");
  if (!row) throw new Error("Eintrag nicht im Papierkorb");

  const { error: del } = await supabase.from("timeline").delete().eq("id", id);
  if (del) throw handleSupabaseError(del, "permanentlyDeleteTimelineEntry:delete");

  await logTrashAuditEvent(supabase, {
    entity: "timeline_row",
    operation: "hard_delete",
    entityId: id,
    label: row.title,
    companyId: row.company_id,
    contactId: row.contact_id,
    userId: user.id,
    profileId: user.id,
  });
}

export async function adminRestoreTimelineEntry(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("timeline")
    .select("id, title, company_id, contact_id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "adminRestoreTimelineEntry");
  if (!row) throw new Error("Eintrag nicht im Papierkorb");

  const { error } = await supabase.from("timeline").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) throw handleSupabaseError(error, "adminRestoreTimelineEntry:update");

  await logTrashAuditEvent(supabase, {
    entity: "timeline_row",
    operation: "restore",
    entityId: id,
    label: row.title,
    companyId: row.company_id,
    contactId: row.contact_id,
    userId: user.id,
    profileId: user.id,
  });
}

export async function bulkRestoreCompanies(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await adminRestoreCompany(id);
  }
}

export async function bulkHardDeleteCompanies(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await permanentlyDeleteCompany(id);
  }
}

export async function bulkRestoreContacts(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await adminRestoreContact(id);
  }
}

export async function bulkHardDeleteContacts(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await permanentlyDeleteContact(id);
  }
}

export async function bulkRestoreReminders(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await adminRestoreReminder(id);
  }
}

export async function bulkHardDeleteReminders(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await permanentlyDeleteReminder(id);
  }
}

export async function bulkRestoreTimelineEntries(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await adminRestoreTimelineEntry(id);
  }
}

export async function bulkHardDeleteTimelineEntries(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await permanentlyDeleteTimelineEntry(id);
  }
}

/** Admin-only: restore a soft-deleted comment. */
export async function adminRestoreComment(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("comments")
    .select("id, body_markdown, entity_id, deleted_at")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "adminRestoreComment");
  if (!row) throw new Error("Notiz nicht im Papierkorb");

  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (error) throw handleSupabaseError(error, "adminRestoreComment:update");

  await logTrashAuditEvent(supabase, {
    entity: "comment",
    operation: "restore",
    entityId: id,
    label: row.body_markdown,
    companyId: row.entity_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

/** Admin-only: hard delete a soft-deleted comment (cascades to attachments + replies). */
export async function permanentlyDeleteComment(id: string): Promise<void> {
  const user = await requireAdmin();
  const supabase = createAdminClient();

  const { data: row, error: fe } = await supabase
    .from("comments")
    .select("id, body_markdown, entity_id")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fe) throw handleSupabaseError(fe, "permanentlyDeleteComment");
  if (!row) throw new Error("Notiz nicht im Papierkorb");

  const { error: del } = await supabase.from("comments").delete().eq("id", id);
  if (del) throw handleSupabaseError(del, "permanentlyDeleteComment:delete");

  await logTrashAuditEvent(supabase, {
    entity: "comment",
    operation: "hard_delete",
    entityId: id,
    label: row.body_markdown,
    companyId: row.entity_id,
    contactId: null,
    userId: user.id,
    profileId: user.id,
  });
}

export async function bulkRestoreComments(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await adminRestoreComment(id);
  }
}

export async function bulkHardDeleteComments(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await permanentlyDeleteComment(id);
  }
}

export async function bulkDeleteCompaniesWithTrash(ids: string[]): Promise<void> {
  await requireUser();
  for (const id of ids) {
    await deleteCompanyWithTrash(id);
  }
}

// ---------------------------------------------------------------------------
// Admin trash list
// ---------------------------------------------------------------------------

export type AdminTrashedCompany = {
  id: string;
  firmenname: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type AdminTrashedContact = {
  id: string;
  vorname: string;
  nachname: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type AdminTrashedReminder = {
  id: string;
  title: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type AdminTrashedTimeline = {
  id: string;
  title: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type AdminTrashedComment = {
  id: string;
  body_markdown: string;
  entity_id: string;
  companyName: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type AdminTrashListPayload = {
  profileDisplayByUserId: Record<string, string>;
  companies: AdminTrashedCompany[];
  contacts: AdminTrashedContact[];
  reminders: AdminTrashedReminder[];
  timeline: AdminTrashedTimeline[];
  comments: AdminTrashedComment[];
};

/**
 * Admin-only: lists every soft-deleted row across all owners. Uses the
 * service-role client to bypass owner-scoped RLS so admins can moderate
 * the full workspace trash bin.
 */
export async function listAdminTrashRows(): Promise<AdminTrashListPayload> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [c, co, r, tl, cm] = await Promise.all([
    supabase
      .from("companies")
      .select("id, firmenname, deleted_at, deleted_by")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("id, vorname, nachname, deleted_at, deleted_by")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("reminders")
      .select("id, title, deleted_at, deleted_by")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("timeline")
      .select("id, title, deleted_at, deleted_by")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, body_markdown, entity_id, deleted_at, deleted_by")
      .eq("entity_type", "company")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);
  if (c.error) throw handleSupabaseError(c.error, "listAdminTrashRows:companies");
  if (co.error) throw handleSupabaseError(co.error, "listAdminTrashRows:contacts");
  if (r.error) throw handleSupabaseError(r.error, "listAdminTrashRows:reminders");
  if (tl.error) throw handleSupabaseError(tl.error, "listAdminTrashRows:timeline");
  if (cm.error) throw handleSupabaseError(cm.error, "listAdminTrashRows:comments");

  const companies = (c.data ?? []) as AdminTrashedCompany[];
  const contacts = (co.data ?? []) as AdminTrashedContact[];
  const reminders = (r.data ?? []) as AdminTrashedReminder[];
  const timeline = (tl.data ?? []) as AdminTrashedTimeline[];
  const commentRows = cm.data ?? [];

  const commentCompanyIds = Array.from(
    new Set(
      commentRows
        .map((row) => row.entity_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const companyNameById: Record<string, string> = {};
  if (commentCompanyIds.length > 0) {
    const { data: cos, error: coe } = await supabase
      .from("companies")
      .select("id, firmenname")
      .in("id", commentCompanyIds);
    if (coe) throw handleSupabaseError(coe, "listAdminTrashRows:commentCompanies");
    for (const row of cos ?? []) {
      if (row.firmenname !== null && row.firmenname !== undefined) {
        companyNameById[row.id] = String(row.firmenname);
      }
    }
  }
  const comments: AdminTrashedComment[] = commentRows.map((row) => ({
    id: row.id,
    body_markdown: String(row.body_markdown ?? ""),
    entity_id: row.entity_id,
    companyName: companyNameById[row.entity_id] ?? null,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
  }));

  const deleterIds = new Set<string>();
  for (const row of [...companies, ...contacts, ...reminders, ...timeline, ...comments]) {
    if (row.deleted_by !== null && row.deleted_by !== undefined && row.deleted_by !== "") {
      deleterIds.add(row.deleted_by);
    }
  }

  const profileDisplayByUserId: Record<string, string> = {};
  const idList = Array.from(deleterIds);
  if (idList.length > 0) {
    const { data: profs, error: pe } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", idList);
    if (pe) throw handleSupabaseError(pe, "listAdminTrashRows:profiles");
    for (const p of profs ?? []) {
      const dn = p.display_name;
      if (dn !== null && dn !== undefined && String(dn).trim() !== "") {
        profileDisplayByUserId[p.id] = String(dn);
      }
    }
  }

  return {
    profileDisplayByUserId,
    companies,
    contacts,
    reminders,
    timeline,
    comments,
  };
}
