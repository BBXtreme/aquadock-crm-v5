"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { feedbackSubmitSchema } from "@/lib/validations/feedback";
import type { Feedback, FeedbackInsert } from "@/types/database.types";

const FEEDBACK_SCREENSHOT_BUCKET = "feedback-screenshots";

const feedbackIdSchema = z.string().uuid();

export type AdminFeedbackListRow = Feedback & {
  authorDisplay: string;
};

export async function submitFeedback(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = feedbackSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first?.message ?? "Invalid input";
    return { ok: false, error: msg };
  }

  const supabase = await createServerSupabaseClient();
  const d = parsed.data;
  const row: FeedbackInsert = {
    user_id: user.id,
    topic: d.topic,
    body: d.body,
    sentiment: d.sentiment,
    page_url: d.page_url ?? null,
    screenshot_url: d.screenshot_url ?? null,
    screenshot_path: d.screenshot_path ?? null,
  };

  const { error } = await supabase.from("feedback").insert(row);
  if (error !== null) {
    const e = handleSupabaseError(error, "submitFeedback");
    return { ok: false, error: e.message };
  }
  return { ok: true };
}

export async function listAdminFeedbackRows(): Promise<AdminFeedbackListRow[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error !== null) {
    throw handleSupabaseError(error, "listAdminFeedbackRows");
  }

  const list = rows ?? [];
  const userIds = Array.from(new Set(list.map((r) => r.user_id)));

  const authorByUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs, error: pe } = await admin.from("profiles").select("id, display_name").in("id", userIds);
    if (pe !== null) {
      throw handleSupabaseError(pe, "listAdminFeedbackRows:profiles");
    }
    for (const p of profs ?? []) {
      const dn = p.display_name;
      if (typeof dn === "string" && dn.trim() !== "") {
        authorByUserId[p.id] = dn.trim();
      }
    }
  }

  return list.map((r) => ({
    ...r,
    authorDisplay: authorByUserId[r.user_id] ?? "",
  }));
}

/** Admin-only: deletes the feedback row and best-effort removes an attached screenshot from Storage. */
export async function deleteAdminFeedbackRow(rawId: unknown): Promise<void> {
  await requireAdmin();
  const parsed = feedbackIdSchema.safeParse(rawId);
  if (!parsed.success) {
    throw new Error("Invalid feedback id");
  }
  const id = parsed.data;
  const admin = createAdminClient();

  const { data: row, error: fetchErr } = await admin
    .from("feedback")
    .select("id, screenshot_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr !== null) {
    throw handleSupabaseError(fetchErr, "deleteAdminFeedbackRow:select");
  }
  if (row === null) {
    throw new Error("Feedback not found");
  }

  const { error: delErr } = await admin.from("feedback").delete().eq("id", id);
  if (delErr !== null) {
    throw handleSupabaseError(delErr, "deleteAdminFeedbackRow:delete");
  }

  const path = row.screenshot_path;
  if (typeof path === "string" && path.trim() !== "") {
    const { error: rmErr } = await admin.storage.from(FEEDBACK_SCREENSHOT_BUCKET).remove([path]);
    if (rmErr !== null) {
      console.warn("deleteAdminFeedbackRow: storage remove failed", rmErr);
    }
  }
}
