"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createInAppNotification } from "@/lib/services/in-app-notifications";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCompanyCommentSchema,
  deleteCommentSchema,
  restoreOwnCommentSchema,
  updateCommentSchema,
} from "@/lib/validations/comment";
import type { CommentWithAuthor, Database } from "@/types/database.types";

/** Shared select-projection so list/create/update return the same joined shape. */
const COMMENT_SELECT = "*, profiles!comments_created_by_fkey(display_name, avatar_url)" as const;

function firstZodMessage(error: { errors: { message: string }[] }): string {
  return error.errors[0]?.message ?? "Ungültige Eingabe";
}

async function requireAuthenticatedUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

export async function listCompanyComments(companyId: string): Promise<CommentWithAuthor[]> {
  await requireAuthenticatedUserId();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("entity_type", "company")
    .eq("entity_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw handleSupabaseError(error, "listCompanyComments");
  }
  return (data ?? []) as CommentWithAuthor[];
}

export async function createCompanyComment(input: unknown): Promise<CommentWithAuthor> {
  const userId = await requireAuthenticatedUserId();

  const parsed = createCompanyCommentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const { companyId, bodyMarkdown, parentId } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("comments")
    .insert({
      entity_type: "company",
      entity_id: companyId,
      parent_id: parentId ?? null,
      body_markdown: bodyMarkdown,
      created_by: userId,
      updated_by: userId,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "createCompanyComment");
  }

  const row = data as CommentWithAuthor;
  if (parentId != null) {
    await maybeNotifyParentCommentAuthorOnReply(supabase, {
      companyId,
      parentCommentId: parentId,
      newCommentId: row.id,
      actorUserId: userId,
    });
  }

  return row;
}

async function maybeNotifyParentCommentAuthorOnReply(
  supabase: SupabaseClient<Database>,
  args: {
    companyId: string;
    parentCommentId: string;
    newCommentId: string;
    actorUserId: string;
  },
) {
  const { data: parent, error: parentError } = await supabase
    .from("comments")
    .select("created_by")
    .eq("id", args.parentCommentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (parentError) {
    console.error("[createCompanyComment] parent comment lookup failed", parentError);
    return;
  }

  const parentAuthor = parent?.created_by;
  if (parentAuthor == null || parentAuthor === args.actorUserId) {
    return;
  }

  try {
    await createInAppNotification({
      type: "comment_reply",
      userId: parentAuthor,
      title: "Neue Antwort auf Ihren Kommentar",
      body: null,
      payload: {
        companyId: args.companyId,
        commentId: args.newCommentId,
        parentCommentId: args.parentCommentId,
      },
      actorUserId: args.actorUserId,
      dedupeKey: `comment_reply:${args.newCommentId}`,
    });
  } catch (err) {
    console.error("[createCompanyComment] in-app notification failed", err);
  }
}

export async function updateComment(input: unknown): Promise<CommentWithAuthor> {
  const userId = await requireAuthenticatedUserId();

  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const { commentId, bodyMarkdown } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("comments")
    .update({
      body_markdown: bodyMarkdown,
      updated_by: userId,
    })
    .eq("id", commentId)
    .eq("created_by", userId)
    .is("deleted_at", null)
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "updateComment");
  }
  return data as CommentWithAuthor;
}

export async function deleteComment(input: unknown): Promise<{ id: string }> {
  const userId = await requireAuthenticatedUserId();

  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const { commentId } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("comments")
    .update({
      deleted_at: now,
      deleted_by: userId,
      updated_by: userId,
    })
    .eq("id", commentId)
    .eq("created_by", userId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error) {
    throw handleSupabaseError(error, "deleteComment");
  }
  return { id: data.id };
}

/**
 * Restore a soft-deleted comment that the current user authored (undo of their own delete).
 * Defense-in-depth: `.eq("created_by", userId)` ensures only the author can restore,
 * independent of RLS. Requires the comment to currently be soft-deleted.
 */
export async function restoreOwnComment(input: unknown): Promise<CommentWithAuthor> {
  const userId = await requireAuthenticatedUserId();

  const parsed = restoreOwnCommentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const { commentId } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("comments")
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_by: userId,
    })
    .eq("id", commentId)
    .eq("created_by", userId)
    .not("deleted_at", "is", null)
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "restoreOwnComment");
  }
  return data as CommentWithAuthor;
}
