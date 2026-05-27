import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type CV_ALLOWED_MIME_TYPES,
  CV_MAX_BYTES,
} from "@/lib/validations/partner-application";
import { PartnerApplicationCvError } from "./cv-errors";
import { createCvUploadToken } from "./upload-token";

export const PARTNER_APPLICATIONS_BUCKET = "partner-applications";

const TMP_PREFIX = "tmp/";
const APPLICATIONS_PREFIX = "applications/";

export function isValidCvStoragePath(path: string): boolean {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (trimmed.includes("..")) {
    return false;
  }
  return trimmed.startsWith(TMP_PREFIX) || trimmed.startsWith(APPLICATIONS_PREFIX);
}

export function buildTmpCvStoragePath(filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${TMP_PREFIX}${randomUUID()}/${safeName}`;
}

export function buildApplicationCvStoragePath(applicationId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${APPLICATIONS_PREFIX}${applicationId}/${safeName}`;
}

export async function cvObjectExists(storagePath: string): Promise<boolean> {
  const path = storagePath.trim();
  if (!isValidCvStoragePath(path)) {
    return false;
  }

  const slash = path.lastIndexOf("/");
  if (slash <= 0) {
    return false;
  }

  const folder = path.slice(0, slash);
  const filename = path.slice(slash + 1);
  const admin = createAdminClient();

  const { data, error } = await admin.storage.from(PARTNER_APPLICATIONS_BUCKET).list(folder, {
    limit: 100,
    search: filename,
  });

  if (error != null || data == null) {
    return false;
  }

  return data.some((entry) => entry.name === filename && entry.id != null);
}

export async function createCvUploadSignedUrl(args: {
  filename: string;
  contentType: (typeof CV_ALLOWED_MIME_TYPES)[number];
  fileSize: number;
}): Promise<{ uploadUrl: string; cvUploadToken: string; expiresIn: number }> {
  if (args.fileSize > CV_MAX_BYTES) {
    throw new Error("file_too_large");
  }
  const storagePath = buildTmpCvStoragePath(args.filename);
  const admin = createAdminClient();
  const expiresIn = 300;
  const { data, error } = await admin.storage
    .from(PARTNER_APPLICATIONS_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error != null || data == null) {
    throw new Error(error?.message ?? "upload_url_failed");
  }

  return {
    uploadUrl: data.signedUrl,
    cvUploadToken: createCvUploadToken(storagePath),
    expiresIn,
  };
}

export async function finalizeCvStoragePath(args: {
  applicationId: string;
  cvStoragePath: string | null | undefined;
}): Promise<string | null> {
  const path = args.cvStoragePath?.trim() ?? "";
  if (path.length === 0) {
    return null;
  }

  if (!isValidCvStoragePath(path)) {
    throw new PartnerApplicationCvError("cv_invalid");
  }

  if (!path.startsWith(TMP_PREFIX)) {
    return path.startsWith(APPLICATIONS_PREFIX) ? path : null;
  }

  const exists = await cvObjectExists(path);
  if (!exists) {
    throw new PartnerApplicationCvError("cv_not_uploaded");
  }

  const filename = path.split("/").pop() ?? "cv.pdf";
  const destPath = buildApplicationCvStoragePath(args.applicationId, filename);
  const admin = createAdminClient();

  const { error: moveError } = await admin.storage
    .from(PARTNER_APPLICATIONS_BUCKET)
    .move(path, destPath);

  if (moveError != null) {
    console.error("[partner-applications] cv move failed", moveError.message);
    throw new PartnerApplicationCvError("cv_move_failed", moveError.message);
  }

  return destPath;
}

export async function createCvDownloadSignedUrl(
  storagePath: string,
  expiresInSeconds = 7 * 24 * 60 * 60,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PARTNER_APPLICATIONS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error != null || data?.signedUrl == null) {
    return null;
  }
  return data.signedUrl;
}
