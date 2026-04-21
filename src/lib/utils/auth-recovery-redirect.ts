import { headers } from "next/headers";
import {
  normalizeSiteUrlOrigin,
  PRODUCTION_CANONICAL_ORIGIN,
} from "@/lib/utils/site-url";

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

export type AuthRedirectPath =
  | "/login"
  | "/set-password"
  | "/access-pending"
  | "/access-denied";

/**
 * Resolves the site origin for Auth redirects (confirmation, recovery, set-password).
 *
 * Order: **`SITE_URL`** → **`NEXT_PUBLIC_SITE_URL`** → **request Host** (custom domain on Vercel) →
 * **`VERCEL_URL`** (preview + production deploy URLs) → **`VERCEL_ENV=production`** fallback →
 * localhost.
 */
export async function resolveSiteOrigin(): Promise<string> {
  const siteUrlServer = process.env.SITE_URL?.trim();
  if (siteUrlServer) {
    return normalizeSiteUrlOrigin(siteUrlServer);
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return normalizeSiteUrlOrigin(fromEnv);
  }

  const h = await headers();
  const origin = originFromForwardedHeaders(
    h.get("x-forwarded-host"),
    h.get("host"),
    h.get("x-forwarded-proto"),
  );
  if (origin) {
    return origin;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const vo = vercel.includes("://") ? vercel : `https://${vercel}`;
    return vo.replace(/\/$/, "");
  }

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_CANONICAL_ORIGIN;
  }

  return "http://localhost:3000";
}

/**
 * Full `redirect_to` URL for Supabase Auth (must match Dashboard → Authentication → Redirect URLs).
 * Use `"/login"` for standard recovery; `"/set-password"` for onboarding grant + admin-created users.
 */
export async function resolveAuthRedirectUrl(
  path: AuthRedirectPath = "/login",
): Promise<string> {
  const origin = await resolveSiteOrigin();
  return `${origin}${path}`;
}

/**
 * @deprecated Prefer `resolveAuthRedirectUrl("/login")` for clarity.
 * `redirectTo` for Supabase `resetPasswordForEmail` (legacy admin recovery → `/login`).
 */
export async function resolveAuthRecoveryRedirectUrl(): Promise<string> {
  return resolveAuthRedirectUrl("/login");
}
