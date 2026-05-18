import { NextResponse } from "next/server";
import { hashShareToken } from "@/lib/standortanalyse/share";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
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

  const isExpired = new Date(shareLink.expires_at).getTime() <= Date.now();
  const isUsageExceeded = shareLink.used_count >= shareLink.max_uses;
  const isAvailable = shareLink.is_active && !isExpired && !isUsageExceeded;

  return NextResponse.json({
    valid: isAvailable,
    requiresPassword: shareLink.password_hash != null,
    expiresAt: shareLink.expires_at,
    usedCount: shareLink.used_count,
    maxUses: shareLink.max_uses,
  });
}
