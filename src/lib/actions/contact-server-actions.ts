"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { maybeNotifyContactAssignment } from "@/lib/actions/companies";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { contactSchema, toContactInsert, toContactUpdate } from "@/lib/validations/contact";
import type { Contact } from "@/types/database.types";

async function resolveContactOwnerUserId(
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

export async function createContactAction(raw: unknown): Promise<Contact> {
  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("Unauthorized");
  }
  const parsed = contactSchema.parse(raw);
  const supabase = await createServerSupabaseClient();
  const userIdOwned = await resolveContactOwnerUserId(supabase, parsed.company_id ?? null, user.id);
  const insert = {
    ...toContactInsert(parsed),
    user_id: userIdOwned,
    created_by: user.id,
    updated_by: user.id,
  };
  const { data, error } = await supabase.from("contacts").insert(insert).select().single();
  if (error) throw handleSupabaseError(error, "createContactAction");
  return data as Contact;
}

export async function updateContactAction(id: string, raw: unknown): Promise<Contact> {
  const user = await getCurrentUser();
  if (user == null) {
    throw new Error("Unauthorized");
  }
  const parsed = contactSchema.parse(raw);
  const supabase = await createServerSupabaseClient();

  const { data: priorRow, error: priorError } = await supabase
    .from("contacts")
    .select("user_id, vorname, nachname, company_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (priorError) throw handleSupabaseError(priorError, "updateContactAction");
  if (priorRow == null) {
    throw new Error("Contact not found");
  }

  const priorUserId = priorRow.user_id ?? null;
  const userIdOwned = await resolveContactOwnerUserId(supabase, parsed.company_id ?? null, user.id);
  const updatePayload = {
    ...toContactUpdate(parsed),
    user_id: userIdOwned,
    updated_by: user.id,
  };
  const { data, error } = await supabase.from("contacts").update(updatePayload).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateContactAction");
  const contact = data as Contact;

  const newUserId = contact.user_id ?? "";
  if (newUserId !== "" && newUserId !== priorUserId) {
    const contactName =
      [contact.vorname, contact.nachname]
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s !== "")
        .join(" ") || "—";
    await maybeNotifyContactAssignment({
      contactId: contact.id,
      companyId: contact.company_id ?? null,
      contactName,
      priorUserId,
      newUserId,
      actorUserId: user.id,
    });
  }

  return contact;
}
