# Vercel production checklist (AquaDock CRM v5)

Short checklist for deploying this Next.js app on **Vercel**. For a fuller runbook (Supabase security, backups, domains), use [`production-deploy.md`](production-deploy.md).

Variable names mirror **`.env.example`** at the repo root (safe to commit; copy to `.env.local` locally).

---

## Environment variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL`  
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- [ ] `SITE_URL` — optional server-only canonical origin (`https://crm.aquadock.de`); if unset, password-reset `redirect_to` uses the **request host** on Vercel (so `crm.aquadock.de` works without duplicating the domain in env). Still set `SITE_URL` if you trigger resets outside a normal browser request or want a fixed origin.  
- [ ] `NEXT_PUBLIC_SITE_URL` — same origin if you also need it on the client; otherwise optional when `SITE_URL` is set  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — only if server code in your fork requires it; **never** `NEXT_PUBLIC_*`  

**Optional — AI enrichment**

- [ ] `AI_GATEWAY_API_KEY` — enables company/contact AI enrichment and gateway credit UI (`src/lib/ai/company-enrichment-gateway.ts`, `src/lib/actions/vercel-ai-credits.ts`)  
- [ ] `AI_ENRICHMENT_XAI_API_KEY` — optional xAI BYOK for Grok via the gateway  
- [ ] `AI_ENRICHMENT_GROK_MODEL` — optional override for the fallback Gateway model id  
- [ ] `AI_ENRICHMENT_DAILY_LIMIT_DEFAULT` — optional integer override for the per-user default daily enrichment quota (defaults to `AI_ENRICHMENT_DEFAULT_DAILY_LIMIT` in `src/lib/services/ai-enrichment-policy.ts`)  

Add `BREVO_API_KEY` (and optional `BREVO_SENDER_NAME` / `BREVO_SENDER_EMAIL` — see [`BREVO_SDK.md`](BREVO_SDK.md)) or rely on per-user SMTP settings in the app database only if you use those features.

---

## Project settings

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Install command | `pnpm install` (enable pnpm in project settings) |
| Build command | `pnpm build` |
| Output | `.next` (default) |
| Node.js | **22.x** — aligned with CI in `.github/workflows/ci.yml` (Vercel's platform default is **24 LTS**; pin to 22 to match CI) |
| pnpm | **10.x** (CI uses `pnpm/action-setup` with `version: 10`) |

---

## Auth and routes

- [ ] **Supabase Auth** — **Site URL** = `https://crm.aquadock.de` (not localhost); **Redirect URLs** includes `https://crm.aquadock.de/login` (and previews if used).  
- [ ] Unauthenticated users cannot access protected routes (`/dashboard`, `/companies`, `/contacts`, `/reminders`, `/timeline`, `/mass-email`, `/openmap`, `/settings`, `/profile`, `/brevo`, etc.).  

---

## Storage

- [ ] **`avatars`** bucket and SQL policies applied: [`src/sql/storage-avatars-bucket.sql`](../src/sql/storage-avatars-bucket.sql)  

**Company comments:** If the feature is enabled in your fork, apply the three SQL files in order and regenerate types — see **Company comments** under Supabase in [`production-deploy.md`](production-deploy.md).

---

## Git integration

- [ ] Repo connected; **Production** branch (e.g. `main`) deploys to production.  
- [ ] **Preview deployments** for PRs are optional but recommended for review.

---

## After deploy

- [ ] Sign-in flow  
- [ ] Create/edit company and contact  
- [ ] Map loads for accounts with coordinates  
- [ ] Email features you rely on (templates / mass / Brevo)  
- [ ] AI enrichment flows, if enabled (`AI_GATEWAY_API_KEY`)  
- [ ] Dark mode and mobile layout  

---

## Troubleshooting

1. **Build fails:** Read the Vercel build log; often missing env or wrong Node version.  
2. **Auth loops:** Check Supabase URL configuration and cookie/session domain.  
3. **RLS errors:** Confirm user is logged in and policies allow the operation; avoid using the service role on the client.

---

Last reviewed: April 20, 2026
