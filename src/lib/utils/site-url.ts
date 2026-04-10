/**
 * Browser-facing origin used in server-triggered auth flows (e.g. password reset emails).
 *
 * The recovery email always contains a **Supabase** hostname first
 * (`…supabase.co/auth/v1/verify?…`); that is normal. The query param **`redirect_to`**
 * is where the user is sent next — that should be your app (e.g. `https://crm.aquadock.de/login`),
 * not `http://localhost:3000`.
 *
 * **Resolution order** (see `resolveAuthRecoveryRedirectUrl` in `auth-recovery-redirect.ts`):
 * `SITE_URL` → `NEXT_PUBLIC_SITE_URL` → **request Host** (custom domain on Vercel) →
 * `VERCEL_URL` → `http://localhost:3000`.
 *
 * **Supabase dashboard:** **Authentication → URL configuration** — set **Site URL** to
 * `https://crm.aquadock.de` and add **Redirect URLs** `https://crm.aquadock.de/login`.
 */
export function normalizeSiteUrlOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getPublicSiteUrl(): string {
  const siteUrlServer = process.env.SITE_URL?.trim();
  if (siteUrlServer) {
    return normalizeSiteUrlOrigin(siteUrlServer);
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return normalizeSiteUrlOrigin(fromEnv);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const origin = vercel.includes("://") ? vercel : `https://${vercel}`;
    return origin.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

/** Full URL Supabase may redirect to after the user opens the recovery link from email. */
export function getAuthRecoveryRedirectUrl(): string {
  return `${getPublicSiteUrl()}/login`;
}
