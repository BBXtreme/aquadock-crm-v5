# AquaDock CRM v5 – Complete Implementation Plan: Professional User Onboarding Flow (Refined)

**Branch context:** `AUTH2`  
**Production domain (locked):** `https://aquadock-crm-glqn.vercel.app/` — all Auth `redirectTo` / confirmation / recovery / set-password URLs must resolve here in production (plus localhost for dev).

---

## 1. Summary of Current State & Root Causes

**Canonical User Management UI**

- Live component: [`src/components/features/profile/UserManagementCard.tsx`](src/components/features/profile/UserManagementCard.tsx), rendered from [`src/app/(protected)/profile/page.tsx`](src/app/(protected)/profile/page.tsx) when `role === "admin"`.
- Legacy duplicate: [`src/components/profile/UserManagementCard.tsx`](src/components/profile/UserManagementCard.tsx) — **grep confirms no imports** outside its own file; only the `features` path is imported by the app. **Delete the legacy file** after this re-verification on the branch.

**Password reset & user creation**

- [`src/lib/services/profile.ts`](src/lib/services/profile.ts): `triggerPasswordReset` and `createUser` use Supabase recovery email APIs; **`redirectTo`** is centralized in [`src/lib/utils/auth-recovery-redirect.ts`](src/lib/utils/auth-recovery-redirect.ts) (today ending at **`/login`**). **Phase 0** must standardize on **`auth.resetPasswordForEmail`** with a documented fallback to **`auth.admin.generateLink({ type: "recovery", … })`** if admin flows prove more reliable, and align **`redirectTo`** with the locked production domain and new **`/set-password`** path for grant flows.

**Auth recovery UX**

- [`src/app/(auth)/login/page.tsx`](src/app/(auth)/login/page.tsx) implements `PasswordRecoveryUpdatePanel` and recovery session handling. A dedicated **`/set-password`** route will **reuse** these patterns; success must **`router.replace("/dashboard")`** (session already established) per locked decision—not `replace("/login")`.

**SMTP**

- Per-user [`getSmtpConfig()`](src/lib/services/smtp.ts) is **not** used for apply-flow or admin notifications. **Locked:** dedicated **server-only** env vars (see §6).

**Approval gate (critical)**

- [`getCurrentUser()`](src/lib/auth/get-current-user.ts) returns `role: profile?.role || "user"` when **no `profiles` row** exists—treating unapproved applicants as normal users. [`profile/page.tsx`](src/app/(protected)/profile/page.tsx) **auto-inserts** a profile if missing. **Locked behavior:** **no `profiles` row until admin Accept**; users with `pending_users.status` not **`accepted`** must **not** enter the CRM shell—they see **`/access-pending`** (or equivalent) and **must not** trigger profile auto-create.

---

## 2. Database Changes

### 2.1 Table: `public.pending_users`

**Columns (finalize as proposed earlier, with locked status enum):**

- `id` `uuid` PK, `gen_random_uuid()`
- `email` `citext` UNIQUE NOT NULL (normalized)
- `display_name` `text` NULL
- `auth_user_id` `uuid` NOT NULL UNIQUE REFERENCES `auth.users(id)` ON DELETE CASCADE
- `status` `text` NOT NULL CHECK IN (`'pending_email_confirmation'`, `'pending_review'`, `'accepted'`, `'declined'`)
- Timestamps: `requested_at`, `email_confirmed_at`, `reviewed_at` (`timestamptz`, nullable where appropriate)
- `reviewed_by` `uuid` NULL REFERENCES `public.profiles(id)`
- `chosen_role` `text` NULL CHECK IN (`'user'`, `'admin'`) when accepted
- `decline_reason` `text` NULL
- `updated_at` `timestamptz` NOT NULL DEFAULT `now()` (+ trigger if the project uses `updated_at` elsewhere)

**Indexes:** `(status)`, `(auth_user_id)`, unique `(email)`.

**RLS (locked):** Enable RLS; policies **admin-only** — e.g. allow `SELECT`/`INSERT`/`UPDATE`/`DELETE` only when `exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')`. **No** anon or self-service policies on this table; **all applicant writes** go through **Server Actions** using **`createAdminClient()`** after validation (service role bypasses RLS but server still enforces business rules).

**Migration:** Single ordered SQL file + **`pnpm supabase:types`** to update [`src/types/database.types.ts`](src/types/database.types.ts).

### 2.2 Timeline

- Prefer **`activity_type`** extension in Zod + DB (if CHECK exists) **or** use **`other`** with titles like **`[Onboarding] Access requested by {email}`** (locked). Always apply **`safeDisplay`** for display names in `user_name` / `content` as appropriate.

### 2.3 No change to `profiles` shape

- Only **when** and **who** inserts—controlled in application logic (Accept only).

---

## 3. Supabase Auth Configuration Checklist (URL redirects, email templates, SMTP)

**Site URL & redirects**

- **Site URL:** `https://aquadock-crm-glqn.vercel.app` (no trailing slash inconsistency in Dashboard).
- **Redirect URL allow list** must include at minimum:
  - `https://aquadock-crm-glqn.vercel.app/login`
  - `https://aquadock-crm-glqn.vercel.app/set-password`
  - `https://aquadock-crm-glqn.vercel.app/access-pending` (if used for post-confirm routing)
  - `http://localhost:3000/login`, `http://localhost:3000/set-password`, `http://localhost:3000/access-pending`
  - Preview deployments if used (`*.vercel.app` patterns per team policy).

**Helpers**

- Extend [`auth-recovery-redirect.ts`](src/lib/utils/auth-recovery-redirect.ts) so **every** server-built Auth URL uses **production-aware** resolution: **`SITE_URL`** → **`NEXT_PUBLIC_SITE_URL`** → **forwarded headers** → **`VERCEL_URL`** → **locked fallback** `https://aquadock-crm-glqn.vercel.app` (replacing or aligning the existing production fallback in that file) + path suffix (`/login`, `/set-password`, etc.).

**SMTP**

- **Supabase Auth** emails: Dashboard Auth SMTP (unchanged from ops).
- **CRM-generated** admin notifications: **locked env vars** only (§6)—not `user_settings`.

---

## 4. New & Modified Files (full list with exact paths)

**New**

- `src/app/(auth)/apply/page.tsx` — public apply form.
- `src/app/(auth)/set-password/page.tsx` — reuse recovery patterns from login; success → `/dashboard`.
- `src/app/(auth)/access-pending/page.tsx` — “Your access request is pending admin approval” (locked UX for confirmed-but-not-accepted users).
- `src/lib/validations/access-request.ts` — Zod `.strict()`, trim, nullable display name.
- `src/lib/services/pending-users.ts` — DB helpers (admin client).
- `src/lib/services/system-smtp.ts` (or similar) — nodemailer using **SMTP_HOST**, **SMTP_PORT**, **SMTP_USER**, **SMTP_PASSWORD**, **SMTP_FROM**; parse **`ADMIN_NOTIFICATION_EMAILS`** (comma-separated).
- `src/lib/actions/onboarding.ts` (or grouped under `profile.ts` if preferred) — apply, accept, decline, timeline hooks.
- `src/sql/pending-users.sql` or `supabase/migrations/…` — DDL + RLS.
- i18n keys in `src/messages/de.json`, `en.json`, `hr.json` — apply, set-password, access-pending, user management pending tab, login CTA; run **`pnpm messages:validate`**.

**Modified**

- [`src/lib/utils/auth-recovery-redirect.ts`](src/lib/utils/auth-recovery-redirect.ts) — **path variants** (`login` vs `set-password` vs `access-pending`), **locked domain** fallbacks including Vercel.
- [`src/lib/services/profile.ts`](src/lib/services/profile.ts) — **Phase 0:** password reset + `createUser` recovery **`redirectTo`**; accept/decline + profile insert only on Accept.
- [`src/lib/auth/get-current-user.ts`](src/lib/auth/get-current-user.ts) and/or [`src/lib/auth/require-user.ts`](src/lib/auth/require-user.ts) and/or [`src/app/(protected)/layout.tsx`](src/app/(protected)/layout.tsx) — **approval gate**: session + no accepted profile / pending row → redirect **`/access-pending`** (avoid treating missing profile as `role: "user"` for CRM access).
- [`src/app/(protected)/profile/page.tsx`](src/app/(protected)/profile/page.tsx) — **remove or guard** auto profile insert so it **never** runs for pending-unapproved users; only run for users who should have CRM access (e.g. after Accept, profile exists).
- [`src/components/features/profile/UserManagementCard.tsx`](src/components/features/profile/UserManagementCard.tsx) — Pending tab + actions.
- [`src/app/(auth)/login/page.tsx`](src/app/(auth)/login/page.tsx) — **Apply for Access** button/link; optional inline message when redirected with query param.
- [`src/lib/validations/timeline.ts`](src/lib/validations/timeline.ts) — optional `activity_type` extension.
- `.env.example` — document new SMTP_* and `ADMIN_NOTIFICATION_EMAILS`.

**Deleted**

- [`src/components/profile/UserManagementCard.tsx`](src/components/profile/UserManagementCard.tsx) — after import check (locked).

---

## 5. Phase-by-Phase Implementation Plan

### Phase 0 (first) — Password reset fix + redirect helper

- Implement **`resolveAuthRecoveryRedirectUrl`** (and siblings, e.g. **`resolveSetPasswordRedirectUrl`**) using **SITE_URL / NEXT_PUBLIC_SITE_URL / headers / VERCEL_URL** and **https://aquadock-crm-glqn.vercel.app** as final production fallback.
- **`triggerPasswordReset`** / **`createUser`**: use **`resetPasswordForEmail`** with correct **`redirectTo`** (e.g. `/set-password` for onboarding-related resets once routed); if observability shows failures, switch admin path to **`generateLink`** + same `redirectTo`.
- **Timeline** optional log line for “reset issued” if product wants parity.

### Phase 1 — Database

- Ship **`pending_users`** with **locked status enum** and **admin-only RLS**.
- Regenerate types.

### Phase 2 — System SMTP + apply flow

- Implement **system-smtp** mailer from **SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ADMIN_NOTIFICATION_EMAILS**.
- **`/apply`**: Zod + `signUp` (browser) + server action creates/updates **`pending_users`** via **service role**; status **`pending_email_confirmation`** → transitions to **`pending_review`** when confirmation is detected (app route or polling once).
- Notify admins on new request via **system SMTP** only.
- **Timeline:** `[Onboarding] …` with **safeDisplay**.

### Phase 3 — Email confirmation & access-pending

- **Locked:** If user confirms email and **`pending_users.status`** is not **`accepted`**, route them to **`/access-pending`** (dedicated page) or show message on login—**implement dedicated page** for clarity and consistent i18n.
- **Do not** create **`profiles`** here.
- **Timeline** log for confirmation when idempotent.

### Phase 4 — Auth gate for CRM

- **`requireUser` / protected layout:** If session exists and user is a **pending applicant** (row in **`pending_users`**, status not **`accepted`**) **or** missing profile where policy requires profile only after Accept, **redirect** to **`/access-pending`** and **block** [`profile/page.tsx`](src/app/(protected)/profile/page.tsx) auto profile creation for that cohort.
- Adjust **`getCurrentUser`** semantics so missing profile does not imply **`role: "user"`** CRM access (may return a discriminated shape or separate helper **`getAccessState()`**).

### Phase 5 — Admin UI

- **`UserManagementCard`:** tab or section **Pending requests** — Accept / Decline + role select (`user` | `admin`).
- **Accept:** insert **`profiles`**, **`resetPasswordForEmail`** (or **`generateLink`**) with **`redirectTo`** → **`https://aquadock-crm-glqn.vercel.app/set-password`** (via helper, not hardcoded string in multiple places), optional “access granted” email via **system SMTP**.
- **Decline:** update status, optional email, optional **`auth.admin.deleteUser`** per policy.
- **Timeline** for accept/decline with **safeDisplay** admin names.

### Phase 6 — `/set-password`

- Copy recovery session logic from login; **`PasswordRecoveryUpdatePanel`** pattern; on success **`router.replace("/dashboard")`** (session persists).
- i18n + tests as needed.

### Phase 7 — Login CTA + polish

- **Apply for Access** on [`login/page.tsx`](src/app/(auth)/login/page.tsx); **`pnpm messages:validate`**.
- Delete legacy **`src/components/profile/UserManagementCard.tsx`**.

### Phase 8 — Quality gates

- `pnpm typecheck`, `pnpm check:fix`, `pnpm test:run`, `pnpm messages:validate`, production build.

---

## 6. Security, RLS & Quality Gate Considerations

- **AIDER-RULES / project rules:** Zod **`.strict()`** at boundaries; no `any`; no abusive `!`; **hook-first** UI; Biome + TS clean.
- **Service role** only in Server Actions after auth checks; **never** expose keys.
- **`pending_users`:** admin-only RLS; writes from applicants only via trusted server code + validation.
- **SMTP secrets:** server-only env; document in `.env.example`, Vercel encrypted env.
- **safeDisplay** for all user-facing name fields in timeline and emails where applicable.

---

## 7. UX & Email Flow Details

| Step | Screen | Email | Timeline |
|------|--------|-------|----------|
| Apply | `/apply` | Supabase confirmation | `[Onboarding] Access requested…` |
| Confirm | redirect → `/access-pending` if not accepted | (Supabase) | Confirmation logged when detected |
| Admin | — | System SMTP to **ADMIN_NOTIFICATION_EMAILS** | — |
| Accept | — | Supabase recovery + optional CRM email | Accept + actor |
| Set password | `/set-password` | — | Complete |
| Decline | — | optional | Decline + actor |

---

## 8. Testing & Rollout Checklist

- [ ] Redirect URLs work on **https://aquadock-crm-glqn.vercel.app** and localhost.
- [ ] Phase 0: admin reset + `createUser` recovery emails arrive with working links.
- [ ] Pending user cannot access CRM routes; sees **`/access-pending`**.
- [ ] **`profiles`** row appears **only** on Accept.
- [ ] **`pnpm messages:validate`** passes.
- [ ] CI: typecheck, Biome, tests, build.

---

## 9. Questions / Clarifications Needed Before Coding

1. **Post-decline auth user:** Should **`declined`** users remain in **`auth.users`** (blocked) or be **deleted** via `auth.admin.deleteUser`? (Affects re-application UX.)
2. **`ADMIN_NOTIFICATION_EMAILS`:** Confirm comma-separated parsing and whether **reply-to** or **CC** all addresses is required.
3. **Preview deployments:** Should redirect allow list include dynamic `*.vercel.app` for QA, or production-only testing?

---

Refined plan complete and ready for approval. Reply with **'APPROVED'** to begin phased implementation (**Phase 0 first:** password reset fix + redirect helper). All changes will strictly follow **AIDER-RULES.md**, only edit explicitly listed files, and ensure full compatibility with Vercel production domain **https://aquadock-crm-glqn.vercel.app/**.
