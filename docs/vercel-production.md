# Vercel production checklist (AquaDock CRM v5)

Short checklist for deploying this Next.js app on **Vercel**. For a fuller runbook (Supabase security, backups, domains), use [`production-deploy.md`](production-deploy.md).

---

## Environment variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL`  
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- [ ] `SITE_URL` — optional server-only canonical origin (`https://crm.aquadock.de`); if unset, password-reset `redirect_to` uses the **request host** on Vercel (so `crm.aquadock.de` works without duplicating the domain in env). Still set `SITE_URL` if you trigger resets outside a normal browser request or want a fixed origin.  
- [ ] `NEXT_PUBLIC_SITE_URL` — same origin if you also need it on the client; otherwise optional when `SITE_URL` is set  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — only if server code in your fork requires it; **never** `NEXT_PUBLIC_*`  

Add Brevo or SMTP-related variables only if you use those features and they read from env.

---

## Project settings

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Install command | `pnpm install` (enable pnpm in project settings) |
| Build command | `pnpm build` |
| Output | `.next` (default) |
| Node.js | **22.x** recommended (aligned with CI in `.github/workflows/ci.yml`) |

---

## Auth and routes

- [ ] **Supabase Auth** — **Site URL** = `https://crm.aquadock.de` (not localhost); **Redirect URLs** includes `https://crm.aquadock.de/login` (and previews if used).  
- [ ] Unauthenticated users cannot access protected routes (`/dashboard`, `/companies`, `/contacts`, `/reminders`, `/timeline`, `/mass-email`, `/openmap`, `/settings`, `/profile`, `/brevo`, etc.).  

---

## Storage

- [ ] **`avatars`** bucket and SQL policies applied: [`src/sql/storage-avatars-bucket.sql`](../src/sql/storage-avatars-bucket.sql)  

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
- [ ] Dark mode and mobile layout  

---

## Troubleshooting

1. **Build fails:** Read the Vercel build log; often missing env or wrong Node version.  
2. **Auth loops:** Check Supabase URL configuration and cookie/session domain.  
3. **RLS errors:** Confirm user is logged in and policies allow the operation; avoid using the service role on the client.

---

Last reviewed: April 2026
