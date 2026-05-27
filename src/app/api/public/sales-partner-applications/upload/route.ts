import { NextResponse } from "next/server";
import { assertAllowedOrigin, corsHeaders } from "@/lib/partner-applications/cors";
import {
  buildTmpCvStoragePath,
  PARTNER_APPLICATIONS_BUCKET,
} from "@/lib/partner-applications/storage";
import { createCvUploadToken } from "@/lib/partner-applications/upload-token";
import { enforceSimpleRateLimit, getRequestIpAddress } from "@/lib/security/simple-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CV_ALLOWED_MIME_TYPES,
  CV_MAX_BYTES,
} from "@/lib/validations/partner-application";

export const runtime = "nodejs";

const CV_UPLOAD_EXPIRES_SECONDS = 300;

function isAllowedContentType(value: string): value is (typeof CV_ALLOWED_MIME_TYPES)[number] {
  return (CV_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * Preferred CV upload path for the marketing site: multipart POST to CRM (CORS on CRM only).
 * Avoids browser cross-origin PUT to Supabase Storage, which often fails due to Storage CORS.
 */
export async function POST(request: Request) {
  const headers = corsHeaders(request);

  try {
    assertAllowedOrigin(request);
  } catch {
    return NextResponse.json({ ok: false, error: "origin_not_allowed" }, { status: 403, headers });
  }

  const ip = getRequestIpAddress(request);
  const rate = enforceSimpleRateLimit({
    key: `partner-application-upload:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_multipart" }, { status: 400, headers });
  }

  const upload = form.get("file");
  if (!(upload instanceof File)) {
    return NextResponse.json({ ok: false, error: "file_required" }, { status: 400, headers });
  }

  const contentType =
    typeof upload.type === "string" && upload.type.trim().length > 0
      ? upload.type.trim()
      : "application/octet-stream";

  if (!isAllowedContentType(contentType)) {
    return NextResponse.json({ ok: false, error: "invalid_content_type" }, { status: 400, headers });
  }

  if (upload.size <= 0 || upload.size > CV_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400, headers });
  }

  const filename = upload.name.trim().length > 0 ? upload.name : "cv.pdf";
  const storagePath = buildTmpCvStoragePath(filename);

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "upload_unavailable" },
      { status: 503, headers },
    );
  }

  const buffer = Buffer.from(await upload.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(PARTNER_APPLICATIONS_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (uploadError != null) {
    console.error("[partner-applications] proxy upload failed", uploadError.message);
    return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500, headers });
  }

  return NextResponse.json(
    {
      ok: true,
      cvUploadToken: createCvUploadToken(storagePath),
      expiresIn: CV_UPLOAD_EXPIRES_SECONDS,
    },
    { headers },
  );
}
