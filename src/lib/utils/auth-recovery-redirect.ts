import { headers } from "next/headers";
import { normalizeSiteUrlOrigin } from "@/lib/utils/site-url";

/**
 * Builds origin from proxy headers (Vercel, etc.). Not a secret — used for password-reset redirect_to.
 */
export function originFromForwardedHeaders(
  forwardedHost: string | null | undefined,
  host: string | null | undefined,
  forwardedProto: string | null | undefined,
): string | null {
  const h =
    forwardedHost?.split(",")[0]?.trim() || host?.trim() || null;
  if (!h) {
    return null;
  }
  const protoPart = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  const proto =
    protoPart === "http" || protoPart === "https" ? protoPart : "https";
  return `${proto}://${h}`.replace(/\/$/, "");
}

/**
 * `redirectTo` for Supabase `resetPasswordForEmail`.
 *
 * Order: **`SITE_URL`** → **`NEXT_PUBLIC_SITE_URL`** → **request Host** (so
 * `https://crm.aquadock.de` works on Vercel without duplicating it in env) →
 * **`VERCEL_URL`** → localhost.
 */
export async function resolveAuthRecoveryRedirectUrl(): Promise<string> {
  const siteUrlServer = process.env.SITE_URL?.trim();
  if (siteUrlServer) {
    return `${normalizeSiteUrlOrigin(siteUrlServer)}/login`;
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return `${normalizeSiteUrlOrigin(fromEnv)}/login`;
  }

  const h = await headers();
  const origin = originFromForwardedHeaders(
    h.get("x-forwarded-host"),
    h.get("host"),
    h.get("x-forwarded-proto"),
  );
  if (origin) {
    return `${origin}/login`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const vo = vercel.includes("://") ? vercel : `https://${vercel}`;
    return `${vo.replace(/\/$/, "")}/login`;
  }

  return "http://localhost:3000/login";
}
