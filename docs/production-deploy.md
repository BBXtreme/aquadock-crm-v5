# Production deployment guide

**Purpose:** A practical checklist for taking AquaDock CRM v5 live. **Authentication is Supabase Auth** (not NextAuth); ignore any legacy NextAuth variables unless you have a different fork.

**Companion:** For a shorter Vercel-only list, see [`vercel-production.md`](vercel-production.md).

---

## 1. Vercel — environment variables

A committed template with placeholders lives at **`.env.example`** in the repository root (`cp .env.example .env.local` for local development).

| Variable | Required | Who sees it | Meaning |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser + server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser + server | Public anon key (RLS still applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | If your deployment uses it | **Server only** | Bypasses RLS; never commit or expose to the client |
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | Recommended for stable auth redirects | Server / client | Canonical origin; see [`vercel-production.md`](vercel-production.md) |

**Optional — AI company/contact enrichment (Vercel AI Gateway):**

| Variable | Required | Notes |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | For enrichment + gateway credit checks | Server only; from [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) |
| `AI_ENRICHMENT_XAI_API_KEY` | No | xAI BYOK so Grok usage can bill through your xAI account via the gateway |
| `AI_ENRICHMENT_GROK_MODEL` | No | Override Gateway model id for the enrichment **fallback** structuring model (see `src/lib/ai/company-enrichment-gateway.ts`) |
| `AI_ENRICHMENT_DAILY_LIMIT_DEFAULT` | No | Override the per-user default daily enrichment quota when a user has no `ai_enrichment` row in `user_settings` (see `src/lib/services/ai-enrichment-policy.ts`) |

Add any other keys your fork uses — for Brevo: `BREVO_API_KEY` plus optional `BREVO_SENDER_NAME` / `BREVO_SENDER_EMAIL` (see [`BREVO_SDK.md`](BREVO_SDK.md)).

**Install / build:** Use **pnpm** (`pnpm install`, `pnpm build`). **Node:** Match your CI (**22.x** — see `.github/workflows/ci.yml`). Vercel's current default Node runtime is **24 LTS**; pinning to **22.x** in the project settings keeps CI and production aligned. **Package manager:** CI pins **pnpm 10** via `pnpm/action-setup`. Framework preset: **Next.js**; output directory **`.next`**.

---

## 2. Supabase

### Storage (avatars)

- [ ] Public bucket **`avatars`** exists and policies are applied — run [`src/sql/storage-avatars-bucket.sql`](../src/sql/storage-avatars-bucket.sql) once per project.  
- [ ] Profile updates store only URLs under the user’s allowed path (see [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md)).

### Row Level Security (RLS)

- [ ] RLS enabled on application tables (`companies`, `contacts`, `reminders`, `timeline`, email tables, `profiles`, `user_settings`, etc.).  
- [ ] Policies match your org’s rules (per-user data, admin paths).  
- [ ] Service role key used only in server code, never in client bundles.

### Operations

- [ ] Backups / point-in-time recovery per your Supabase plan.  
- [ ] Connection pooling (e.g. Supavisor) if you add direct Postgres clients or migrations — follow Supabase docs for `DATABASE_URL` vs `DIRECT_URL`.

---

## 3. Security (plain language)

- **Browser bundle:** Only `NEXT_PUBLIC_*` and the anon key are visible to users. Treat the anon key as public but rely on RLS.  
- **Service role:** Equivalent to full database access — secrets manager or Vercel encrypted env only.  
- **Uploads:** Validate file type and size in app code; Storage policies enforce folder ownership.  
- **Input:** Zod on forms; never trust raw client input on the server.

---

## 4. Domain and HTTPS

1. Add your domain in the Vercel project → **Domains**.  
2. Set DNS records exactly as Vercel shows (often `CNAME` for subdomains).  
3. Wait for propagation; Vercel provisions **HTTPS** automatically.

---

## 5. Performance and monitoring

- Enable **Vercel Analytics** (and optional Speed Insights) if you want real-user metrics.  
- Use **Supabase** dashboards for slow queries and API usage.  
- Optional: Sentry or similar for client/server errors — not required by the repo but common for production.

---

## 6. Before and after go-live

**Before**

- [ ] Staging deploy with production-like env vars.  
- [ ] Login, CRUD on companies/contacts, email paths you use, map, settings.  
- [ ] Mobile smoke test.

**After**

- [ ] Confirm redirects for unauthenticated users.  
- [ ] Confirm cron or background jobs (if you add any) and rate limits on external APIs (e.g. Brevo).

---

## 7. Maintenance

- Dependency updates: security patches regularly; run `pnpm build` and tests after upgrades.  
- Regenerate types after DB changes: `pnpm supabase:types`.  
- After changing `src/messages/*.json`, run `pnpm messages:validate` before merge (keeps `de` / `en` / `hr` keys aligned).

---

## Emergency / ownership

Replace placeholders with your team’s contacts:

- **Application / repo:** [your team]  
- **Vercel:** [Vercel support / dashboard]  
- **Supabase:** [Supabase support / dashboard]  
- **Domain registrar:** [registrar support]

---

Last reviewed: April 20, 2026
