"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  COMMENT_ATTACHMENT_MAX_BYTES,
  COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
  COMMENT_FILES_BUCKET,
  commentAttachmentPathMatchesCompanyAndComment,
  createSignedUrlForCommentAttachmentPath,
} from "@/lib/services/comment-attachments";
import { createInAppNotification } from "@/lib/services/in-app-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  COMMENT_ENTITY_COMPANY,
  createCompanyCommentSchema,
  deleteCommentAttachmentSchema,
  deleteCommentSchema,
  getCommentAttachmentSignedUrlSchema,
  registerCommentAttachmentSchema,
  restoreOwnCommentSchema,
  updateCommentSchema,
} from "@/lib/validations/comment";
import type {
  CommentAttachment,
  CommentWithAuthor,
  CompanyCommentAttachmentListItem,
  Database,
} from "@/types/database.types";

/**
 * Shared projection: author profile + nested attachment rows (`comment_attachments` ordered in app code).
 */
const COMMENT_THREAD_SELECT =
  "*, profiles!comments_created_by_fkey(display_name, avatar_url), comment_attachments(id, comment_id, file_name, content_type, byte_size, storage_object_path, created_at, created_by)" as const;

function sortAttachmentsOnComments(rows: CommentWithAuthor[]): CommentWithAuthor[] {
  return rows.map((row) => {
    const attachments = row.comment_attachments;
    if (attachments === undefined || attachments === null) {
      return { ...row, comment_attachments: [] };
    }
    const sorted = [...attachments].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { ...row, comment_attachments: sorted };
  });
}

/** PostgREST typings may surface a one-to-one embed as an array; normalize for runtime checks. */
function unwrapSingleEmbed<T>(embedded: T | T[] | null | undefined): T | null {
  if (embedded === undefined || embedded === null) {
    return null;
  }
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

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
    .select(COMMENT_THREAD_SELECT)
    .eq("entity_type", COMMENT_ENTITY_COMPANY)
    .eq("entity_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw handleSupabaseError(error, "listCompanyComments");
  }
  return sortAttachmentsOnComments((data ?? []) as CommentWithAuthor[]);
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
      entity_type: COMMENT_ENTITY_COMPANY,
      entity_id: companyId,
      parent_id: parentId ?? null,
      body_markdown: bodyMarkdown,
      created_by: userId,
      updated_by: userId,
    })
    .select(COMMENT_THREAD_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "createCompanyComment");
  }

  const row = sortAttachmentsOnComments([data as CommentWithAuthor])[0] as CommentWithAuthor;
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
    .select(COMMENT_THREAD_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "updateComment");
  }
  return sortAttachmentsOnComments([data as CommentWithAuthor])[0] as CommentWithAuthor;
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
    .select(COMMENT_THREAD_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "restoreOwnComment");
  }
  return sortAttachmentsOnComments([data as CommentWithAuthor])[0] as CommentWithAuthor;
}

/**
 * Persist metadata for an object uploaded to Storage under `COMMENT_FILES_BUCKET`.
 * Caller must upload first using the canonical path `{companyId}/{commentId}/{…}`.
 */
export async function registerCommentAttachment(input: unknown): Promise<CommentAttachment> {
  const userId = await requireAuthenticatedUserId();

  const parsed = registerCommentAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const { companyId, commentId, storageObjectPath, fileName, contentType, byteSize } = parsed.data;

  const size = byteSize ?? null;
  if (size !== null && COMMENT_ATTACHMENT_MAX_BYTES < size) {
    throw new Error("Datei ist zu groß");
  }

  if (!commentAttachmentPathMatchesCompanyAndComment(storageObjectPath, companyId, commentId)) {
    throw new Error("Speicherpfad passt nicht zu diesem Kommentar");
  }

  const supabase = await createServerSupabaseClient();

  const { data: commentRow, error: commentError } = await supabase
    .from("comments")
    .select("id, entity_type, entity_id, created_by, deleted_at")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError !== null) {
    throw handleSupabaseError(commentError, "registerCommentAttachment:comments");
  }
  if (commentRow === null) {
    throw new Error("Kommentar nicht gefunden");
  }

  if (commentRow.deleted_at !== null) {
    throw new Error("Kommentar ist nicht aktiv");
  }
  if (commentRow.entity_type !== COMMENT_ENTITY_COMPANY) {
    throw new Error("Ungültiger Kommentarkontext");
  }
  if (commentRow.entity_id !== companyId) {
    throw new Error("Firma passt nicht zum Kommentar");
  }
  if (commentRow.created_by !== userId) {
    throw new Error("Nur eigene Kommentare können Anhänge erhalten");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("comment_attachments")
    .insert({
      comment_id: commentId,
      file_name: fileName,
      content_type: contentType ?? null,
      byte_size: size,
      storage_object_path: storageObjectPath,
      created_by: userId,
    })
    .select("*")
    .single();

  if (insertError !== null) {
    throw handleSupabaseError(insertError, "registerCommentAttachment");
  }

  return inserted as CommentAttachment;
}

export async function listCompanyCommentAttachments(
  companyId: string,
): Promise<CompanyCommentAttachmentListItem[]> {
  await requireAuthenticatedUserId();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comment_attachments")
    .select(
      `
      *,
      comments!inner (
        id,
        body_markdown,
        created_at,
        entity_id,
        entity_type,
        deleted_at
      )
    `,
    )
    .eq("comments.entity_type", COMMENT_ENTITY_COMPANY)
    .eq("comments.entity_id", companyId)
    .is("comments.deleted_at", null)
    .order("created_at", { ascending: false });

  if (error !== null) {
    throw handleSupabaseError(error, "listCompanyCommentAttachments");
  }

  const rows = (data ?? []) as CompanyCommentAttachmentListItem[];
  return rows.map((r) => {
    const normalized = unwrapSingleEmbed(r.comments);
    return { ...r, comments: normalized };
  });
}

export async function getCommentAttachmentSignedUrl(input: unknown): Promise<{ signedUrl: string }> {
  await requireAuthenticatedUserId();

  const parsed = getCommentAttachmentSignedUrlSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from("comment_attachments")
    .select(
      `
      storage_object_path,
      file_name,
      comments!inner (
        entity_type,
        entity_id,
        deleted_at
      )
    `,
    )
    .eq("id", parsed.data.attachmentId)
    .maybeSingle();

  if (error !== null) {
    throw handleSupabaseError(error, "getCommentAttachmentSignedUrl");
  }
  if (row === null) {
    throw new Error("Anhang nicht gefunden");
  }

  const parent = unwrapSingleEmbed(row.comments);
  if (parent === null) {
    throw new Error("Anhang nicht verfügbar");
  }
  if (parent.entity_type !== COMMENT_ENTITY_COMPANY || parent.deleted_at !== null) {
    throw new Error("Anhang nicht verfügbar");
  }

  const pathRaw = row.storage_object_path;
  const path = typeof pathRaw === "string" ? pathRaw.trim() : "";
  if (path.length === 0) {
    throw new Error("Speicherpfad fehlt");
  }

  /** Prefer service role: Storage RLS `SELECT` / sign can fail for the session client even when Postgres RLS allowed the row (sign path should not depend on storage.objects visibility). */
  let clientForSign: SupabaseClient<Database>;
  try {
    clientForSign = createAdminClient();
  } catch {
    clientForSign = supabase;
  }

  /** Omit `{ download }` so Storage does not force `Content-Disposition: attachment`; browsers can open/PDF‑preview/hand off to desktop viewers when allowed. Filename comes from Storage metadata. */
  return await createSignedUrlForCommentAttachmentPath(
    clientForSign,
    path,
    COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
  );
}

/**
 * Deletes metadata and the Storage object for an attachment. Only the **comment author** may delete (same rule as uploads).
 */
export async function deleteCommentAttachment(input: unknown): Promise<void> {
  const userId = await requireAuthenticatedUserId();

  const parsed = deleteCommentAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }

  const supabase = await createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from("comment_attachments")
    .select(
      `
      id,
      storage_object_path,
      comments!inner (
        id,
        entity_type,
        deleted_at,
        created_by,
        entity_id
      )
    `,
    )
    .eq("id", parsed.data.attachmentId)
    .maybeSingle();

  if (error !== null) {
    throw handleSupabaseError(error, "deleteCommentAttachment");
  }
  if (row === null) {
    throw new Error("Anhang nicht gefunden");
  }

  const parent = unwrapSingleEmbed(row.comments);
  if (parent === null || parent.entity_type !== COMMENT_ENTITY_COMPANY) {
    throw new Error("Anhang nicht verfügbar");
  }
  if (parent.deleted_at !== null) {
    throw new Error("Kommentar ist nicht aktiv");
  }
  if (parent.created_by !== userId) {
    throw new Error("Nur der Autor kann Anhänge entfernen");
  }

  const path = typeof row.storage_object_path === "string" ? row.storage_object_path.trim() : "";
  if (path.length === 0) {
    throw new Error("Speicherpfad fehlt");
  }

  const id = parsed.data.attachmentId;
  const { error: deleteErr } = await supabase.from("comment_attachments").delete().eq("id", id);
  if (deleteErr !== null) {
    throw handleSupabaseError(deleteErr, "deleteCommentAttachment:delete");
  }

  try {
    const admin = createAdminClient();
    const { error: rmErr } = await admin.storage.from(COMMENT_FILES_BUCKET).remove([path]);
    if (rmErr !== null) {
      await supabase.storage.from(COMMENT_FILES_BUCKET).remove([path]);
    }
  } catch {
    await supabase.storage.from(COMMENT_FILES_BUCKET).remove([path]);
  }
}
