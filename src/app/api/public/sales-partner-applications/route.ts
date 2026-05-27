import { NextResponse } from "next/server";
import {
  buildAdminNotificationEmail,
  getPartnerApplicationAdminListUrl,
  getPartnerApplicationNotifyEmail,
  getPartnerApplicationPrivacyUrl,
} from "@/lib/partner-applications/admin-notification-email";
import { buildApplicantConfirmationEmail } from "@/lib/partner-applications/confirmation-email";
import { notifyAdminsOfNewPartnerApplication } from "@/lib/partner-applications/admin-in-app-notification";
import { assertAllowedOrigin, corsHeaders } from "@/lib/partner-applications/cors";
import { PartnerApplicationCvError } from "@/lib/partner-applications/cv-errors";
import {
  findDuplicateActiveApplication,
  insertPartnerApplication,
} from "@/lib/partner-applications/persistence";
import {
  createCvDownloadSignedUrl,
  cvObjectExists,
  isValidCvStoragePath,
} from "@/lib/partner-applications/storage";
import { verifyCvUploadToken } from "@/lib/partner-applications/upload-token";
import { enforceSimpleRateLimit, getRequestIpAddress } from "@/lib/security/simple-rate-limit";
import { sendNotificationHtmlEmail } from "@/lib/services/smtp-delivery";
import { partnerApplicationSubmitSchema } from "@/lib/validations/partner-application";

async function resolveCvStoragePathFromToken(
  cvUploadToken: string | undefined,
): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const token = cvUploadToken?.trim() ?? "";
  if (token.length === 0) {
    return { ok: true, path: null };
  }

  const verified = verifyCvUploadToken(token);
  if (verified == null || !isValidCvStoragePath(verified.storagePath)) {
    return { ok: false, error: "cv_invalid" };
  }

  const exists = await cvObjectExists(verified.storagePath);
  if (!exists) {
    return { ok: false, error: "cv_not_uploaded" };
  }

  return { ok: true, path: verified.storagePath };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);

  try {
    assertAllowedOrigin(request);
  } catch {
    return NextResponse.json({ ok: false, error: "origin_not_allowed" }, { status: 403, headers });
  }

  const ip = getRequestIpAddress(request);
  const rate = enforceSimpleRateLimit({
    key: `partner-application-submit:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers });
  }

  const parsed = partnerApplicationSubmitSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_error", issues: parsed.error.flatten() },
      { status: 400, headers },
    );
  }

  if (parsed.data.hp?.trim()) {
    return NextResponse.json({ ok: true }, { headers });
  }

  const cvResolved = await resolveCvStoragePathFromToken(parsed.data.cvUploadToken);
  if (!cvResolved.ok) {
    return NextResponse.json({ ok: false, error: cvResolved.error }, { status: 400, headers });
  }

  try {
    const duplicate = await findDuplicateActiveApplication(parsed.data.email);
    if (duplicate) {
      return NextResponse.json({ ok: false, error: "duplicate_application" }, { status: 409, headers });
    }

    const { id, cvStoragePath } = await insertPartnerApplication({
      input: parsed.data,
      cvStoragePath: cvResolved.path,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    const privacyUrl = getPartnerApplicationPrivacyUrl(parsed.data.locale);
    const applicantEmail = buildApplicantConfirmationEmail({
      locale: parsed.data.locale,
      firstName: parsed.data.firstName,
      applicationId: id,
      privacyUrl,
    });

    try {
      await sendNotificationHtmlEmail({
        to: [parsed.data.email],
        subject: applicantEmail.subject,
        html: applicantEmail.html,
        text: applicantEmail.text,
      });
    } catch (e) {
      console.error("[partner-applications] applicant email failed", e);
    }

    const finalCvUrl =
      cvStoragePath != null ? await createCvDownloadSignedUrl(cvStoragePath) : null;

    const adminEmail = buildAdminNotificationEmail({
      input: parsed.data,
      applicationId: id,
      cvDownloadUrl: finalCvUrl,
      adminListUrl: `${getPartnerApplicationAdminListUrl()}/${id}`,
    });

    try {
      await sendNotificationHtmlEmail({
        to: [getPartnerApplicationNotifyEmail()],
        subject: adminEmail.subject,
        html: adminEmail.html,
        text: adminEmail.text,
      });
    } catch (e) {
      console.error("[partner-applications] admin email failed", e);
    }

    try {
      await notifyAdminsOfNewPartnerApplication({
        applicationId: id,
        input: parsed.data,
      });
    } catch (e) {
      console.error("[partner-applications] in-app admin notify failed", e);
    }

    return NextResponse.json({ ok: true, applicationId: id }, { headers });
  } catch (e) {
    if (e instanceof PartnerApplicationCvError) {
      return NextResponse.json({ ok: false, error: e.code }, { status: 400, headers });
    }
    console.error("[partner-applications] submit failed", e);
    return NextResponse.json({ ok: false, error: "persist_failed" }, { status: 500, headers });
  }
}
