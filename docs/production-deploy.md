# Production deployment guide

**Purpose:** A practical checklist for taking AquaDock CRM v5 live. **Authentication is Supabase Auth** (not NextAuth); ignore any legacy NextAuth variables unless you have a different fork.

**Companion:** For a shorter Vercel-only list, see [`vercel-production.md`](vercel-production.md).

---

## 1. Vercel — environment variables

| Variable | Required | Who sees it | Meaning |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser + server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser + server | Public anon key (RLS still applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | If your deployment uses it | **Server only** | Bypasses RLS; never commit or expose to the client |

Add any other keys your fork uses (e.g. Brevo API keys if configured in your environment).

**Install / build:** Use **pnpm** (`pnpm install`, `pnpm build`). **Node:** Match your CI (e.g. **22.x** — see `.github/workflows/ci.yml`). Framework preset: **Next.js**; output directory **`.next`**.

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

---

## Emergency / ownership

Replace placeholders with your team’s contacts:

- **Application / repo:** [your team]  
- **Vercel:** [Vercel support / dashboard]  
- **Supabase:** [Supabase support / dashboard]  
- **Domain registrar:** [registrar support]

---

Last reviewed: April 2026
