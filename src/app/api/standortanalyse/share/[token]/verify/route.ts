import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceSimpleRateLimit, getRequestIpAddress } from "@/lib/security/simple-rate-limit";
import { hashShareToken, verifySharePassword } from "@/lib/standortanalyse/share";
import { createAdminClient } from "@/lib/supabase/admin";

const verifyShareAccessSchema = z
  .object({
    password: z.string().min(1, "Passwort erforderlich"),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ip = getRequestIpAddress(request);
  const rate = enforceSimpleRateLimit({
    key: `standortanalyse-share-verify:${token}:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte später erneut versuchen." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const parsed = verifyShareAccessSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Passwort erforderlich" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const tokenHash = hashShareToken(token);

  const { data: shareLink, error } = await admin
    .from("standortanalyse_share_links")
    .select("id, expires_at, max_uses, used_count, is_active, password_hash")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || shareLink == null) {
    return NextResponse.json({ error: "Share-Link ungültig" }, { status: 404 });
  }

  if (!shareLink.is_active) {
    return NextResponse.json({ error: "Share-Link ist deaktiviert" }, { status: 410 });
  }
  if (new Date(shareLink.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Share-Link ist abgelaufen" }, { status: 410 });
  }
  if (shareLink.used_count >= shareLink.max_uses) {
    return NextResponse.json({ error: "Share-Link wurde bereits verwendet" }, { status: 410 });
  }

  if (shareLink.password_hash == null) {
    // Link is not password-protected — treat any verify call as success so the
    // client can simply proceed.
    return NextResponse.json({ valid: true });
  }

  const validPassword = verifySharePassword(parsed.data.password, shareLink.password_hash);
  if (!validPassword) {
    return NextResponse.json({ error: "Passwort ungültig" }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
