/**
 * Helpers for CRM company comment attachments (private `comment-files` bucket).
 * Path layout must match docs/SUPABASE_SCHEMA.md and `storage-comment-files-bucket.sql` RLS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/** Matches `storage.buckets.id` — private bucket (`public = false`). Re-export for browser uploads. */
export const COMMENT_FILES_BUCKET = "comment-files" as const;

/** Approx. max blob size enforced in app tier (Storage project limits apply separately). */
export const COMMENT_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

/** Default expiry for downloads (private bucket). */
export const COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 300;

const PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/;

/** Prefer Web Crypto UUID — `node:crypto` in bundles imported by Client Components resolves to crypto-browserify where `randomUUID` is absent under Turbopack. */
function randomBasenameUuidForStorage(): string {
  const c = globalThis.crypto;
  if (c !== undefined && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  throw new Error("crypto.randomUUID unavailable");
}

/**
 * Produce a deterministic second-segment basename: `{uuid}_{sanitized_original}`.
 */
export function sanitizeCommentAttachmentFilename(originalName: string): string {
  const base = originalName.replace(/^.*[/\\]/, "");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "");
  const trimmed = cleaned.slice(0, 120);
  return trimmed.length > 0 ? trimmed : "file";
}

/** Object key under bucket: `{companyId}/{commentId}/{uuid}_{basename}`. */
export function buildCommentAttachmentObjectPath(args: {
  companyId: string;
  commentId: string;
  originalFileName: string;
}): string {
  const safe = sanitizeCommentAttachmentFilename(args.originalFileName);
  const id = randomBasenameUuidForStorage();
  return `${args.companyId}/${args.commentId}/${id}_${safe}`;
}

/**
 * Validates that `storage_object_path` written to Postgres matches canonical layout
 * and expected company/thread segments (prefix check; RLS completes enforcement).
 */
export function commentAttachmentPathMatchesCompanyAndComment(
  storageObjectPath: string,
  companyId: string,
  commentId: string,
): boolean {
  const segments = storageObjectPath.split("/").filter((s) => s.length > 0);
  if (segments.length < 3) {
    return false;
  }
  if (segments[0] !== companyId || segments[1] !== commentId) {
    return false;
  }
  const basename = segments[segments.length - 1];
  if (basename === undefined || basename.length === 0) {
    return false;
  }
  if (!PATH_SEGMENT_PATTERN.test(basename)) {
    return false;
  }
  return true;
}

export async function createSignedUrlForCommentAttachmentPath(
  supabase: SupabaseClient<Database>,
  storageObjectPath: string,
  expiresSeconds: number,
  options?: { downloadFileName?: string | null },
): Promise<{ signedUrl: string }> {
  const downloadName = options?.downloadFileName?.trim();
  const signOptions =
    downloadName !== undefined && downloadName !== null && downloadName.length > 0
      ? { download: downloadName }
      : undefined;

  const { data, error } = await supabase.storage
    .from(COMMENT_FILES_BUCKET)
    .createSignedUrl(storageObjectPath, expiresSeconds, signOptions);

  if (error !== null) {
    throw new Error(error.message || "SIGN_URL_FAILED");
  }
  const signedUrl = data?.signedUrl;
  if (signedUrl === undefined || signedUrl.length === 0) {
    throw new Error("SIGN_URL_MISSING");
  }
  return { signedUrl };
}
