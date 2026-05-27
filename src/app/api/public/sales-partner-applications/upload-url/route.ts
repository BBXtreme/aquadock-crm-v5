import { NextResponse } from "next/server";
import { assertAllowedOrigin, corsHeaders } from "@/lib/partner-applications/cors";
import { createCvUploadSignedUrl } from "@/lib/partner-applications/storage";
import { enforceSimpleRateLimit, getRequestIpAddress } from "@/lib/security/simple-rate-limit";
import { partnerApplicationUploadUrlSchema } from "@/lib/validations/partner-application";

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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers });
  }

  const parsed = partnerApplicationUploadUrlSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_error", issues: parsed.error.flatten() },
      { status: 400, headers },
    );
  }

  try {
    const result = await createCvUploadSignedUrl(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upload_url_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers });
  }
}
