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

**Install / build:** Use **pnpm** (`pnpm install`, `pnpm build`). **Node:** **24.x** LTS — match CI (see `.github/workflows/ci.yml`) and [`.nvmrc`](../.nvmrc). On Vercel, use **24.x** in project settings (platform default) so local, CI, and production match. **Package manager:** CI uses the same **pnpm** minor as `package.json#packageManager` via `pnpm/action-setup`. Framework preset: **Next.js**; output directory **`.next`**.

### GitHub Actions: CI and Playwright

The workflow in **`.github/workflows/ci.yml`** runs `pnpm typecheck`, Biome, `pnpm test:ci`, and `pnpm build` on each PR, then an **e2e** job that runs Playwright against `http://127.0.0.1:3000`. The e2e job’s `next start` uses the fresh build output (no long-lived dev server in CI). Configure the same **`NEXT_PUBLIC_SUPABASE_*`** values the app needs at runtime as [GitHub Actions **variables**](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/variables) so the client bundle in CI can reach your Supabase project.

- **Repository secrets (optional; required for full authenticated coverage):** `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` — a **dedicated** non-production test user in Supabase Auth, password set via the **Supabase dashboard** (or Admin API), able to open the protected CRM and **not** stuck on `/access-pending` onboarding. The user must be allowed by RLS to **insert `companies` rows** (same as a normal sales user), because `company-create.spec.ts` creates a timestamped test company and searches for it. The workflow reads `secrets.E2E_USER_EMAIL` and `secrets.E2E_USER_PASSWORD` (use **secrets**, not Variables). Without them, authenticated tests in `tests/e2e/` are skipped; public smoke tests still run.

**Local E2E:** `pnpm build` then `pnpm e2e`. Put `E2E_*` in **`.env.local`** — `playwright.config.ts` uses `loadEnvConfig` from `@next/env` so the Playwright Node process loads them automatically. Authenticated specs pin UI locale to English via `tests/e2e/helpers/locale.ts` (`aquadock_appearance_locale` in `localStorage`). See [`.env.example`](../.env.example).

Details: [`docs/architecture.md`](architecture.md#testing-vitest--playwright) and [`playwright.config.ts`](../playwright.config.ts).

---

## 2. Supabase

### Storage (avatars)

- [ ] Public bucket **`avatars`** exists and policies are applied — run [`src/sql/storage-avatars-bucket.sql`](../src/sql/storage-avatars-bucket.sql) once per project.  
- [ ] Profile updates store only URLs under the user’s allowed path (see [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md)).

### Row Level Security (RLS)

**Before changes:** create a manual backup and save [`pg_policies` / `relrowsecurity`](https://www.postgresql.org/docs/current/view-pg-policies.html) output — queries in [`src/sql/rls-rollout-backup-queries.sql`](../src/sql/rls-rollout-backup-queries.sql). Apply on **staging** first; smoke test, then **`pnpm e2e`** with [`E2E_*`](architecture.md#testing-vitest--playwright) secrets. **Post-rollout verification SQL** for staging is in [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §4 (*Quick verification*).

Operator checklist: **Recommended final action (staging rollout)** and **Next action** paragraphs at the top of [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §4 — then script order, Quick verification SQL, smoke, **`pnpm e2e`**, Linter, production gate.

Apply **in order** (see [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §4 — includes **staging → production** smoke steps and monitoring):

- [ ] [`src/sql/rls-helpers.sql`](../src/sql/rls-helpers.sql) — `public.is_app_admin()`
- [ ] [`src/sql/core-crm-rls-collaborative.sql`](../src/sql/core-crm-rls-collaborative.sql) — core CRM + email tables + ENABLE RLS (drops `dev_allow_all_inserts` where present); smoke after this batch on staging (companies, reminders, timeline, mass-email log)
- [ ] [`src/sql/rls-profiles-settings-consolidate.sql`](../src/sql/rls-profiles-settings-consolidate.sql) — `profiles`, `user_settings`
- [ ] Comments RLS chain (if comments feature is used): [`comments-rls.sql`](../src/sql/comments-rls.sql) → [`comments-trash-alignment.sql`](../src/sql/comments-trash-alignment.sql) → [`comments-attachments-delete-policy.sql`](../src/sql/comments-attachments-delete-policy.sql) — same order as [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §4 step 4; smoke comments after applying
- [ ] **Staging:** manual smoke (normal user + admin `/admin/users`, `/admin/trash`), **`pnpm e2e`**, Database **Linter** — zero RLS-related ERRORs before production
- [ ] **Production:** repeat the same script order in a low-traffic window; then [`src/sql/rls-post-deploy-hardening.sql`](../src/sql/rls-post-deploy-hardening.sql) once smoke is green (optional on staging first to validate `pg_proc` names)
- [ ] **Post-rollout:** monitor 30–60 min (company lists, Realtime, reminders); plan follow-up for slow queries / FK indexes per linter
- [ ] **Performance (after collaborative RLS is stable):** [`src/sql/rls-planner-subselect-wrap.sql`](../src/sql/rls-planner-subselect-wrap.sql) — wraps `auth.uid()` / `is_app_admin()` in scalar subqueries for planner-friendly RLS (see [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §4 step 6). May appear as several Supabase migration names in the dashboard; semantics match the single file in-repo.

### Auth + dashboard RPCs (single-round-trip loader / aggregates)

Apply when rolling out the CRM performance stack (staging first). Run **`pnpm supabase:types`** after each batch so [`src/types/supabase.ts`](../src/types/supabase.ts) matches.

- [ ] [`src/sql/get-crm-user-context.sql`](../src/sql/get-crm-user-context.sql) — `get_crm_user_context()` for layout auth (profile + pending gate in one call)
- [ ] [`src/sql/dashboard-kpis.sql`](../src/sql/dashboard-kpis.sql) — `get_dashboard_kpis(period_days)` server-side dashboard counts
- [ ] [`src/sql/companies-filter-buckets.sql`](../src/sql/companies-filter-buckets.sql) — `companies_filter_buckets()` for companies list filter chips

- [ ] Supabase **Database Linter:** resolve ERROR-level findings (RLS disabled, policy duplicates, DEFINER exposure) after rollout  
- [ ] Service role key used only in server code, never in client bundles  

### Company comments (optional feature)

If you use company comments, apply these **in order** in the Supabase SQL Editor (or your migration pipeline); see [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §2 and §4.

- [ ] [`src/sql/profiles-table.sql`](../src/sql/profiles-table.sql) — if `public.profiles` is missing (prerequisite for comments FKs)
- [ ] [`src/sql/comments-tables.sql`](../src/sql/comments-tables.sql) — tables, indexes, triggers  
- [ ] [`src/sql/comments-rls.sql`](../src/sql/comments-rls.sql) — collaborative SELECT/INSERT + attachments (requires `rls-helpers.sql` + core CRM policies first)  
- [ ] [`src/sql/comments-trash-alignment.sql`](../src/sql/comments-trash-alignment.sql) — moderation UPDATE/DELETE (company record owner + admin)  

Then run **`pnpm supabase:types`** so `src/types/supabase.ts` matches the live schema.

- [ ] [`src/sql/comments-attachments-delete-policy.sql`](../src/sql/comments-attachments-delete-policy.sql) — **`DELETE`** on `comment_attachments` (author or company record owner or admin)
- [ ] Server env **`SUPABASE_SERVICE_ROLE_KEY`** (Vercel/server only) — required for preferred **`POST /api/comment-attachments/upload`**, admin **signed URL** generation, and robust Storage cleanup on delete (see [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §9).

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
- Optional: client/server **error monitoring** (a third-party service) — not required by the repo but common for production.

**Docs in-repo:** [`docs/perf/baseline-2026-05-01.md`](perf/baseline-2026-05-01.md) (Speed Insights anchor + re-measure cadence), [`docs/perf/hot-paths-explain.md`](perf/hot-paths-explain.md) (`EXPLAIN (ANALYZE, BUFFERS)` templates for dashboard RPCs). Advisor summaries live under [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) §4 (*Database linter snapshot*).

### Region alignment (TTFB)

The protected shell pays a Supabase Auth round-trip on every navigation (proxy + layout). Cross-region traffic between Vercel Functions and Supabase multiplies that latency. **Verify and align both** before chasing further code-level wins:

- [ ] **Supabase project region** — Supabase Dashboard → *Project Settings → General → Region*. For a Frankfurt user base, this should be **`eu-central-1`** (Frankfurt). Region change is **not** an in-place setting; it requires a new project + database migration ([Supabase docs: project regions](https://supabase.com/docs/guides/platform/regions)).
- [ ] **Vercel Functions region** — Vercel Dashboard → *Project → Settings → Functions → Region*. For Frankfurt, set to **`fra1`** (Frankfurt). The default is `iad1` (US East) for legacy projects; new projects default to the closest region but should be confirmed.
- [ ] Re-measure protected-route P75 TTFB in **Vercel Speed Insights** 24h after any region change.

### JWT signing keys (asymmetric)

The proxy uses `supabase.auth.getClaims()` first and falls back to `getUser()` when claims cannot be verified locally. With the **default symmetric (HS256) signing key** that older Supabase projects use, `getClaims()` still triggers a network verification path for the JWT (see `@supabase/auth-js` `GoTrueClient.getClaims`). To unlock the **zero Auth-server round-trip** path on every navigation:

- [ ] In the Supabase Dashboard → *Project Settings → Auth → JWT Signing Keys*, **rotate to an asymmetric key** (`ES256` recommended, or `RS256`). This publishes a JWKS endpoint that `@supabase/auth-js` caches for local verification via WebCrypto.
- [ ] After rotation, all clients re-receive a JWT signed with the new key on next sign-in / token refresh — **no app-code change required**.
- [ ] Expect protected-route P75 TTFB to drop a further ~150–500 ms in `eu-central` once the cache is warm; verify in Speed Insights.

**Roll-out safety:** asymmetric rotation is reversible in the dashboard; existing JWTs remain valid until they expire (≤ 1 hour). Plan during a low-traffic window even though no downtime is expected.

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

Last reviewed: May 1, 2026
