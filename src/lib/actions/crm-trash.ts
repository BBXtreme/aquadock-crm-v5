"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import { TIMELINE_DELETE_NO_ACTIVE_ROW } from "@/lib/constants/timeline-delete";
import { logTrashAuditEvent } from "@/lib/server/delete-audit";
import { fetchTrashBinPreference } from "@/lib/services/user-settings";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
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
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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

export async function bulkDeleteCompaniesWithTrash(ids: string[]): Promise<void> {
  await requireUser();
  for (const id of ids) {
    await deleteCompanyWithTrash(id);
  }
}
