"use client";

import { registerCommentAttachment } from "@/lib/actions/comments";
import {
  buildCommentAttachmentObjectPath,
  COMMENT_ATTACHMENT_MAX_BYTES,
  COMMENT_FILES_BUCKET,
} from "@/lib/services/comment-attachments";
import { createClient } from "@/lib/supabase/browser";

export type UploadCommentAttachmentsFailure =
  | { ok: false; kind: "too_large" }
  | { ok: false; kind: "upload"; message: string }
  | { ok: false; kind: "register"; message: string };

export async function uploadCommentAttachmentsForComment(args: {
  companyId: string;
  commentId: string;
  files: File[];
}): Promise<{ ok: true } | UploadCommentAttachmentsFailure> {
  const { companyId, commentId, files } = args;

  for (const file of files) {
    if (COMMENT_ATTACHMENT_MAX_BYTES < file.size) {
      return { ok: false, kind: "too_large" };
    }

    let res: Response | null = null;
    try {
      const fd = new FormData();
      fd.set("companyId", companyId);
      fd.set("commentId", commentId);
      fd.set("file", file);
      res = await fetch("/api/comment-attachments/upload", { method: "POST", body: fd });
    } catch {
      res = null;
    }

    if (res?.ok === true) {
      continue;
    }

    if (res !== null && res.status !== 503) {
      const parsed = (await res.json().catch(() => null)) as { error?: string } | null;
      const msg =
        parsed !== null && typeof parsed.error === "string" && parsed.error.trim().length > 0 ? parsed.error : res.statusText;
      return { ok: false, kind: "upload", message: msg };
    }

    const supabase = createClient();
    const storageObjectPath = buildCommentAttachmentObjectPath({
      companyId,
      commentId,
      originalFileName: file.name,
    });
    const { error: uploadError } = await supabase.storage.from(COMMENT_FILES_BUCKET).upload(storageObjectPath, file, {
      contentType: file.type.trim().length > 0 ? file.type : "application/octet-stream",
      upsert: false,
    });
    if (uploadError !== null) {
      return { ok: false, kind: "upload", message: uploadError.message };
    }
    try {
      await registerCommentAttachment({
        companyId,
        commentId,
        storageObjectPath,
        fileName: file.name,
        contentType: file.type.trim().length > 0 ? file.type : null,
        byteSize: file.size,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "register_failed";
      return { ok: false, kind: "register", message };
    }
  }

  return { ok: true };
}
