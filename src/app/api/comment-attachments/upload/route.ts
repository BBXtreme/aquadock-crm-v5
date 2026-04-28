import { NextResponse } from "next/server";
import { registerCommentAttachment } from "@/lib/actions/comments";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  buildCommentAttachmentObjectPath,
  COMMENT_ATTACHMENT_MAX_BYTES,
  COMMENT_FILES_BUCKET,
} from "@/lib/services/comment-attachments";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Trusted upload path for comment files: verifies the session user, uploads with the service role
 * (bypasses Storage RLS quirks with browser JWT uploads), then calls `registerCommentAttachment`.
 * Fallback in `CompanyCommentsCard` uses the browser client when service role env is absent (503).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const companyIdRaw = form.get("companyId");
  const commentIdRaw = form.get("commentId");
  const upload = form.get("file");

  if (typeof companyIdRaw !== "string" || companyIdRaw.length === 0) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }
  if (typeof commentIdRaw !== "string" || commentIdRaw.length === 0) {
    return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
  }

  let file: Blob;
  let suggestedName = "file";
  if (!(upload instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  file = upload;
  suggestedName = upload.name.trim().length > 0 ? upload.name : suggestedName;

  if (COMMENT_ATTACHMENT_MAX_BYTES < file.size) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Server upload unavailable (SUPABASE_SERVICE_ROLE_KEY not configured)" },
      { status: 503 },
    );
  }

  const storageObjectPath = buildCommentAttachmentObjectPath({
    companyId: companyIdRaw.trim(),
    commentId: commentIdRaw.trim(),
    originalFileName: suggestedName,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType =
    "type" in file && typeof file.type === "string" && file.type.trim().length > 0
      ? file.type
      : "application/octet-stream";

  const { error: uploadError } = await admin.storage.from(COMMENT_FILES_BUCKET).upload(storageObjectPath, buffer, {
    contentType,
    upsert: false,
  });

  if (uploadError !== null) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  try {
    const row = await registerCommentAttachment({
      companyId: companyIdRaw.trim(),
      commentId: commentIdRaw.trim(),
      storageObjectPath,
      fileName: suggestedName,
      contentType:
        typeof file.type === "string" && file.type.trim().length > 0 ? file.type : null,
      byteSize: file.size,
    });
    return NextResponse.json({
      ok: true,
      id: row.id,
      storageObjectPath,
    });
  } catch (e) {
    await admin.storage.from(COMMENT_FILES_BUCKET).remove([storageObjectPath]).catch(() => {
      /* best-effort cleanup */
    });
    const message = e instanceof Error ? e.message : "register_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
