# AquaDock CRM – Supabase Schema v5

**Version**: 5.0 (March 2026)  
**Last audited**: 2026-05-01  
**Environment**: Supabase PostgreSQL 15+  

**Reading guide:** **Business readers** — use section 1 for “what each table is for.” **Developers** — sections 2–6 for columns, RLS, and indexes; section 6–7 for type generation and Zod alignment. **Operations** — Storage (`avatars`, `comment-files`) and backup items in section 9 and deployment docs.

**Tenancy:** RLS and `user_id` on records model **per-user** ownership (and admin override where policies allow), not **multi-tenant org / workspace** objects. A future “org” or deal-pipeline layer would be additive schema on top of this v5 design.

## 1. Database Overview

| Table           | Purpose                   | ~Rows | PK   | Main Relations            | RLS  | Key Indexes                  |
| --------------- | ------------------------- | ----- | ---- | ------------------------- | ---- | ---------------------------- |
| companies       | Core business entities    | 450   | uuid | —                         | Yes  | status, user_id, kundentyp   |
| contacts        | Persons / decision makers | 1 200 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| reminders       | Tasks & follow-ups        | 320   | uuid | → companies.id (required) | Yes  | company_id, due_date, status |
| timeline        | Activity log              | 2 800 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| comments        | Threaded notes on companies | —   | uuid | → companies, self (parent), profiles | Yes | entity list, parent thread |
| comment_attachments | File metadata per company comment (`storage_object_path` → `comment-files` bucket) | — | uuid | → comments, profiles | Yes | comment_id |
| email_log       | Outgoing email tracking   | 1 900 | uuid | —                         | Yes  | —                            |
| email_templates | Reusable email templates  | 18    | uuid | —                         | Yes  | name (unique)                |
| user_settings   | User preferences          | 50    | uuid | user_id                   | Yes  | user_id, key                 |
| user_notifications | In-app notification inbox | —  | uuid | user_id, actor_user_id    | Yes  | user_id, created_at, unread partial |
| profiles        | User profiles & roles     | 20    | uuid | → auth.users(id)          | Yes  | id                           |

## 2. Core Tables – Column Overview

### companies

| Column     | Type        | Nullable | Default           | Business Meaning                          | Notes / Index |
| ---------- | ----------- | -------- | ----------------- | ----------------------------------------- | ------------- |
| id         | uuid        | false    | gen_random_uuid() | Primary key                               | PK            |
| firmenname | text        | false    | —                 | Legal name                                | —             |
| rechtsform | text        | true     | —                 | Legal form (GmbH, UG, etc.)               | —             |
| kundentyp  | text        | false    | 'sonstige'        | restaurant, hotel, marina, camping, …     | Indexed       |
| firmentyp  | text        | true     | —                 | kette, einzeln                            | —             |
| status     | text        | false    | 'lead'            | Pipeline + lifecycle (see §3); aligns with `statusOptions` in `src/lib/constants/company-options.ts` | Indexed       |
| value      | bigint      | true     | 0                 | Estimated deal value (€)                  | —             |
| strasse    | text        | true     | —                 | Street address                            | —             |
| plz        | text        | true     | —                 | Postal code                               | —             |
| stadt      | text        | true     | —                 | City                                      | —             |
| bundesland | text        | true     | —                 | State/Province                            | —             |
| land       | text        | true     | —                 | Country (ISO 3166-1 alpha-2)              | Stored **uppercase** (e.g. `DE`, `HR`) or **`NULL`**. Application normalization and labels: `src/lib/countries/iso-land.ts` (`normalizeLandInput`, `getLandRegionDisplayName`, `getLandFlagEmoji`). One-time legacy cleanup (German labels / synonyms → ISO): [`src/sql/normalize-companies-land-to-iso.sql`](../src/sql/normalize-companies-land-to-iso.sql). Optional Postgres **`CHECK`** on shape is documented **commented** at the bottom of that script (not enabled by default). |
| lat / lon  | real        | true     | —                 | Geographic coordinates                    | —             |
| osm        | text        | true     | —                 | OSM node/way/relation ID                  | —             |
| email      | text        | true     | —                 | Email address                             | —             |
| telefon    | text        | true     | —                 | Phone number                              | —             |
| website    | text        | true     | —                 | Website URL                               | —             |
| notes      | text        | true     | —                 | Additional notes                          | —             |
| wasserdistanz | real       | true     | —                 | Water distance                            | —             |
| wassertyp  | text        | true     | —                 | Water type                                | —             |
| import_batch | text       | true     | —                 | Import batch identifier                   | —             |
| search_vector | tsvector   | true     | —                 | Full-text search vector                   | —             |
| user_id    | uuid        | true     | —                 | Owner (auth.uid())                        | Indexed       |
| created_by | uuid        | true     | —                 | Created by user (profiles.id)             | —             |
| updated_by | uuid        | true     | —                 | Updated by user (profiles.id)             | —             |
| created_at | timestamptz | true     | now()             | —                                         | —             |
| updated_at | timestamptz | true     | now()             | —                                         | —             |
| deleted_at | timestamptz | true     | —                 | Soft delete timestamp                     | —             |
| deleted_by | uuid        | true     | —                 | User who soft-deleted (`auth.users.id`)   | FK → auth.users |

### contacts

| Column      | Type        | Nullable | Default           | Business Meaning              | Notes / Index |
| ----------- | ----------- | -------- | ----------------- | ----------------------------- | ------------- |
| id          | uuid        | false    | gen_random_uuid() | Primary key                   | PK            |
| vorname     | text        | false    | —                 | First name                    | —             |
| nachname    | text        | false    | —                 | Last name                     | —             |
| anrede      | text        | true     | —                 | Salutation (Herr, Frau, etc.) | —             |
| position    | text        | true     | —                 | Job title                     | —             |
| email       | text        | true     | —                 | Email address                 | —             |
| telefon     | text        | true     | —                 | Phone number                  | —             |
| mobil       | text        | true     | —                 | Mobile number                 | —             |
| durchwahl   | text        | true     | —                 | Extension                     | —             |
| notes       | text        | true     | —                 | Additional notes              | —             |
| search_vector | tsvector   | true     | —                 | Full-text search vector       | —             |
| company_id  | uuid        | true     | —                 | Foreign key to companies      | Indexed       |
| is_primary  | boolean     | true     | false             | Primary contact flag          | Nullable in API types; default false |
| user_id     | uuid        | true     | —                 | Owner (auth.uid())            | Indexed       |
| created_by  | uuid        | true     | —                 | Created by user (profiles.id) | —             |
| updated_by  | uuid        | true     | —                 | Updated by user (profiles.id) | —             |
| created_at  | timestamptz | true     | now()             | —                             | —             |
| updated_at  | timestamptz | true     | now()             | —                             | —             |
| deleted_at  | timestamptz | true     | —                 | Soft delete timestamp         | —             |
| deleted_by  | uuid        | true     | —                 | User who soft-deleted         | FK → auth.users |

**Bulk owner sync:** When `companies.user_id` changes from the company edit UI with “apply to contacts”, `syncContactUserIdsForCompany` in `src/lib/companies/sync-contact-user-ids.ts` updates `contacts.user_id` (and `updated_by`) for all non-deleted rows with the same `company_id`.

**Ownership audit (timeline):** Whenever `updateCompany` receives a `user_id` patch and the value actually changes (including clearing to `null`), `maybeAppendCompanyOwnershipTimelineAudit` in `src/lib/actions/companies.ts` inserts a `timeline` row on that company (`activity_type: other`, localized title `companies.timelineOwnershipChangedTitle` with profile display names or “unassigned” / “unknown”).

### reminders

| Column     | Type        | Nullable | Default           | Business Meaning         | Notes / Index |
| ---------- | ----------- | -------- | ----------------- | ------------------------ | ------------- |
| id         | uuid        | false    | gen_random_uuid() | Primary key              | PK            |
| title      | text        | false    | —                 | Reminder title           | —             |
| company_id | uuid        | false    | —                 | Foreign key to companies | Indexed       |
| due_date   | timestamptz | false    | —                 | Due date                 | Indexed       |
| priority   | text        | true     | 'normal'          | hoch, normal, niedrig    | —             |
| status     | text        | true     | 'open'            | open, closed             | Indexed       |
| assigned_to| text        | true     | —                 | Assigned person          | —             |
| description| text        | true     | —                 | Description              | —             |
| user_id    | uuid        | true     | —                 | Owner (auth.uid())       | Indexed       |
| created_by | uuid        | true     | —                 | Created by user (profiles.id) | —             |
| updated_by | uuid        | true     | —                 | Updated by user (profiles.id) | —             |
| completed_at | timestamptz | true     | —                 | Completion timestamp     | —             |
| deleted_at | timestamptz | true     | —                 | Soft-delete (Papierkorb) | Indexed       |
| deleted_by | uuid        | true     | —                 | User who soft-deleted    | FK → auth.users |
| created_at | timestamptz | true     | now()             | —                        | —             |

### timeline

| Column     | Type        | Nullable | Default           | Business Meaning         | Notes / Index |
| ---------- | ----------- | -------- | ----------------- | ------------------------ | ------------- |
| id         | uuid        | false    | gen_random_uuid() | Primary key              | PK            |
| title      | text        | false    | —                 | Event title              | —             |
| activity_type | text       | false    | —                 | Activity type            | —             |
| content    | text        | true     | —                 | Event description        | —             |
| company_id | uuid        | true     | —                 | Foreign key to companies | Indexed       |
| contact_id | uuid        | true     | —                 | Foreign key to contacts  | —             |
| user_id    | uuid        | true     | —                 | Owner (auth.uid())       | Indexed       |
| user_name  | text        | true     | —                 | User name                | —             |
| created_by | uuid        | true     | —                 | Created by user (`profiles.id`) | —             |
| updated_by | uuid        | true     | —                 | Last editor (`profiles.id`); no `updated_at` column on this table | —             |
| deleted_at | timestamptz | true     | —                 | Soft-delete (Papierkorb) | Indexed       |
| deleted_by | uuid        | true     | —                 | User who soft-deleted    | FK → auth.users |
| created_at | timestamptz | true     | now()             | —                        | —             |

### comments

Company-scoped threaded comments. **Phase 1:** `entity_type` is constrained to `'company'` and `entity_id` references `companies.id` (CASCADE on company delete). **Authoring keys** (`created_by`, `updated_by`, `deleted_by`) reference **`profiles.id`** (not `auth.users` directly), consistent with generated types.

| Column         | Type        | Nullable | Default           | Business Meaning                    | Notes / Index |
| -------------- | ----------- | -------- | ----------------- | ----------------------------------- | ------------- |
| id             | uuid        | false    | gen_random_uuid() | Primary key                         | PK            |
| entity_type    | text        | false    | 'company'         | Target entity kind                  | CHECK = `'company'` only (Phase 1) |
| entity_id      | uuid        | false    | —                 | Target row (`companies.id`)         | FK → companies, indexed list pattern |
| parent_id      | uuid        | true     | —                 | Parent comment for threading        | FK → comments (CASCADE); same entity enforced by trigger |
| body_markdown  | text        | false    | —                 | Markdown body                     | —             |
| created_at     | timestamptz | false    | now()             | —                                   | —             |
| updated_at     | timestamptz | false    | now()             | Last edit (maintained by trigger)   | —             |
| created_by     | uuid        | false    | —                 | Author (`profiles.id`)              | FK → profiles |
| updated_by     | uuid        | true     | —                 | Last editor (`profiles.id`)         | FK → profiles |
| deleted_at     | timestamptz | true     | —                 | Soft delete (Papierkorb)            | Partial indexes exclude deleted rows where noted in SQL |
| deleted_by     | uuid        | true     | —                 | Actor who soft-deleted              | FK → profiles |

**Triggers:** `trg_comments_set_updated_at` sets `updated_at` on UPDATE; `trg_comments_validate_parent` ensures `parent_id` (if set) points to a non-deleted comment on the same `entity_type` / `entity_id`.

**Source SQL (apply in order on a new project):** [`src/sql/profiles-table.sql`](../src/sql/profiles-table.sql) (if `public.profiles` is missing), then [`src/sql/comments-tables.sql`](../src/sql/comments-tables.sql), then [`src/sql/comments-rls.sql`](../src/sql/comments-rls.sql), then [`src/sql/comments-trash-alignment.sql`](../src/sql/comments-trash-alignment.sql) (extends RLS so the company owner can SELECT soft-deleted comments, UPDATE for restore, and DELETE for hard delete — see §4).

### comment_attachments

Attachment rows per comment; binary payload lives in **Supabase Storage** bucket `comment-files` (private). The app registers metadata after upload (see §9).

| Column               | Type        | Nullable | Default           | Business Meaning     | Notes / Index |
| -------------------- | ----------- | -------- | ----------------- | -------------------- | ------------- |
| id                   | uuid        | false    | gen_random_uuid() | Primary key          | PK            |
| comment_id           | uuid        | false    | —                 | Parent comment       | FK → comments (CASCADE), indexed |
| file_name            | text        | false    | —                 | Original file name   | —             |
| content_type         | text        | true     | —                 | MIME type            | —             |
| byte_size            | bigint      | true     | —                 | Size in bytes        | —             |
| storage_object_path  | text        | false    | —                 | Path inside bucket   | Format `{company_uuid}/{comment_uuid}/{object_name}` — must match `comment-files` RLS (first path segment = `companies.id`, `companies.user_id = auth.uid()`, company not soft-deleted) |
| created_at           | timestamptz | false    | now()             | —                    | —             |
| created_by           | uuid        | false    | —                 | Uploader (`profiles.id`) | FK → profiles |

### email_log

| Column     | Type        | Nullable | Default           | Business Meaning         | Notes / Index |
| ---------- | ----------- | -------- | ----------------- | ------------------------ | ------------- |
| id         | uuid        | false    | gen_random_uuid() | Primary key              | PK            |
| recipient_email| text       | false    | —                 | Email recipient          | —             |
| recipient_name| text       | true     | —                 | Recipient name           | —             |
| subject    | text        | true     | —                 | Email subject            | —             |
| template_name| text       | true     | —                 | Template name            | —             |
| mode       | text        | true     | —                 | Email mode               | —             |
| batch_id   | text        | true     | —                 | Batch identifier         | —             |
| status     | text        | true     | —                 | Email status             | —             |
| sent_at    | timestamptz | true     | —                 | Sent timestamp           | —             |
| spam_score | real        | true     | —                 | Spam score               | —             |
| error_msg  | text        | true     | —                 | Error message            | —             |
| user_id    | uuid        | true     | —                 | Owner (auth.uid())       | —             |
| created_at | timestamptz | true     | now()             | —                        | —             |
| updated_at | timestamptz | true     | now()             | —                        | —             |

### email_templates

| Column | Type        | Nullable | Default           | Business Meaning         | Notes / Index |
| ------ | ----------- | -------- | ----------------- | ------------------------ | ------------- |
| id     | uuid        | false    | gen_random_uuid() | Primary key              | PK            |
| name   | text        | false    | —                 | Template name            | Unique        |
| subject| text        | false    | —                 | Email subject            | —             |
| body   | text        | false    | —                 | Email body               | —             |
| created_at | timestamptz | true     | now()             | —                        | —             |
| updated_at | timestamptz | true     | now()             | —                        | —             |

### user_settings

| Column     | Type        | Nullable | Default           | Business Meaning         | Notes / Index |
| ---------- | ----------- | -------- | ----------------- | ------------------------ | ------------- |
| id         | uuid        | false    | gen_random_uuid() | Primary key              | PK            |
| user_id    | uuid        | false    | —                 | Owner (auth.uid())       | Indexed       |
| key        | text        | false    | —                 | Setting key              | Indexed       |
| value      | jsonb       | true     | —                 | Setting value            | —             |
| created_at | timestamptz | true     | now()             | —                        | —             |
| updated_at | timestamptz | true     | now()             | —                        | —             |

**Known `key` values (EAV)**: `notification_push_enabled` / `notification_email_enabled` (boolean; see `NOTIFICATION_SETTING_KEYS` in `src/lib/constants/notifications.ts` — `notification_email_enabled` gates **transactional** CRM notification emails, not Brevo marketing), `notification_admin_global_in_app_feed` (boolean; **admin only** — when true, the server mirrors each primary in-app `user_notifications` row to this user’s inbox; absent ⇒ false), `trash_bin_enabled` (JSON boolean; absent row ⇒ Papierkorb enabled), **`smtp_config`** (JSON string: host, port, user, password, optional `fromName` / `secure` — per-user SMTP; used in Settings and by `getSystemSmtpConfigForNotifications` in `src/lib/services/smtp-delivery.ts`, see **Transactional email** under `user_notifications` below). Soft-delete visibility is enforced in the **application** (PostgREST filters on `deleted_at`), not by additional RLS policies for this feature.

### user_notifications

In-app **notification feed** (bell / notifications page). One row per delivered notification for a recipient. **`type` values** are app-defined (e.g. `reminder_assigned`, `timeline_on_company`, `comment_reply`); `payload` is a JSON object with stable IDs for deep links (`companyId`, `reminderId`, `commentId`, …).

**Admin global feed (optional mirrors):** Admins can enable **`notification_admin_global_in_app_feed`** in **Settings** (EAV in `user_settings`). When enabled, the server inserts **additional** rows for that admin after every **primary** in-app notification (same `type`, `payload`, `actor_user_id` as the business recipient’s row; title prefixed, body may include the original recipient’s display name for context). `dedupe_key` for these copies is `admin_feed:{primary_notification_id}:{admin_user_id}`. Only `profiles.role = 'admin'` users who opt in receive copies. Implementation: `src/lib/services/in-app-notifications.ts` (`mirrorInAppNotificationToAdmins`). No extra DB migration beyond existing `user_notifications` and `user_settings`.

| Column         | Type        | Nullable | Default           | Business Meaning            | Notes / Index |
| -------------- | ----------- | -------- | ----------------- | --------------------------- | ------------- |
| id             | uuid        | false    | gen_random_uuid() | Primary key                 | PK            |
| user_id        | uuid        | false    | —                 | Recipient (auth user)        | FK → auth.users, indexed    |
| type           | text        | false    | —                 | Machine event key           | —             |
| title          | text        | false    | —                 | Short list title            | —             |
| body           | text        | true     | —                 | Optional detail            | —             |
| payload        | jsonb       | false    | `'{}'`            | Deep-link / context ids     | —             |
| actor_user_id  | uuid        | true     | —                 | User who caused the event   | FK → auth.users (SET NULL)  |
| read_at        | timestamptz | true     | —                 | When marked read; null = unread | Partial index unread |
| dedupe_key     | text        | true     | —                 | Optional idempotency key   | UNIQUE when not null        |
| created_at     | timestamptz | false    | now()              | —                           | Indexed (with user_id)     |

**RLS:** `SELECT` and `UPDATE` for `auth.uid() = user_id` only. **No** `INSERT` / `DELETE` for `authenticated` — new rows are written from trusted **server** code with the **service role** (bypasses RLS; see `createAdminClient` in `src/lib/supabase/admin.ts`). This avoids clients forging notifications to arbitrary recipients.

**Realtime:** The table is added to the `supabase_realtime` publication ([`src/sql/user_notifications.sql`](../src/sql/user_notifications.sql)) with `REPLICA IDENTITY FULL` so the browser can subscribe to **`INSERT` and `UPDATE`** with filter `user_id=eq.<uid>` (header badge + notifications list invalidate via `useInAppNotificationsRealtime` in `@/lib/realtime/in-app-notifications-realtime`). **Already-deployed** databases that predate this line: run [`user-notifications-replica-identity.sql`](../src/sql/user-notifications-replica-identity.sql) once.

**Zod / validation:** See `src/lib/validations/notification.ts` (in-app v1) for strict payload shapes per `type`.

**Transactional email (parity with in-app):** The server does **not** store outbound mail in Postgres. After each **successful** `user_notifications` insert (including **admin global feed** mirror rows), the app may send one **HTML + plain-text** message to the recipient’s email from **`auth.users`**, provided `user_settings` has `notification_email_enabled` true, nodemailer can obtain SMTP settings via **`getSystemSmtpConfigForNotifications(actor_user_id)`** (prefer the acting user’s `smtp_config`, else the first `profiles.role = 'admin'` user with a saved `smtp_config`), and `sendNotificationHtmlEmail` in `src/lib/services/smtp-delivery.ts` completes. **Deep links** in the message body use a canonical app origin from `getPublicSiteUrl()` in `src/lib/utils/site-url.ts` plus a path from `getInAppNotificationActionPath` in `src/lib/notifications/in-app-action-path.ts` (mirrors the notifications UI). HTML bodies are built in `src/lib/email/build-notification-email.ts` (`buildNotificationEmailContent`); wire-up and error handling (log-only; never roll back the in-app row) live in `maybeSendInAppEmailForNotificationRow` in `src/lib/services/in-app-notifications.ts`. **User-facing** hints: **Settings** → Benachrichtigungen (E-Mail) and **Settings** → SMTP. No migration beyond existing `user_settings` keys and `user_notifications`.

### profiles

**Bootstrap SQL:** [`src/sql/profiles-table.sql`](../src/sql/profiles-table.sql) — run on any database that does not yet have `public.profiles` (required before comments / several RLS scripts).

| Column       | Type        | Nullable | Default | Business Meaning         | Notes / Index    |
| ------------ | ----------- | -------- | ------- | ------------------------ | ---------------- |
| id               | uuid        | false    | —       | References auth.users.id | PK, FK           |
| role             | text        | false    | 'user'  | User role (user / admin) | CHECK constraint |
| display_name     | text        | true     | —       | Display name for UI      | —                |
| avatar_url       | text        | true     | —       | Profile picture URL      | —                |
| last_sign_in_at  | timestamptz | true     | —       | Last auth sign-in (synced for admin UI) | —        |
| created_at       | timestamptz | false    | now()   | Creation timestamp       | —                |
| updated_at       | timestamptz | false    | now()   | Last update timestamp    | —                |

**Constraints**: `role` must be 'user' or 'admin'
**RLS**: Users can view/update own profile. Admins can view all profiles.

**`avatar_url` (profile pictures)**  
Holds the **public** Storage URL of the user’s avatar, or `null` if none. The app uploads files with the **browser** Supabase client (`createClient()` from `@/lib/supabase/browser`) and persists the URL via the server action `updateProfileAvatar` in `@/lib/actions/profile.ts`, which validates that the URL belongs to the current user’s folder under the `avatars` bucket.

## 3. Important Enums & Constraints

- `comments.entity_type`: currently only `'company'` (CHECK on table); reserved for future entity kinds.
- `companies.status` (Zod + UI): `'lead' | 'interessant' | 'qualifiziert' | 'akquise' | 'angebot' | 'gewonnen' | 'verloren' | 'kunde' | 'partner' | 'inaktiv'` — canonical labels in `src/lib/constants/company-options.ts` (`statusOptions`).
- `reminders.priority`: `'hoch' | 'normal' | 'niedrig'`
- `reminders.status`: `'open' | 'closed'`

## 4. Row Level Security (RLS) – Summary

**Next action — staging rollout:** Apply on **staging** or a **DB branch** in the **exact order** documented below (**Apply order** and **Order summary**). After **each major batch**, run **Quick verification** SQL (Supabase SQL Editor; subsection below) **plus** the **smoke checklist** (*Staging first*). Then run full **`pnpm e2e`** and Supabase **Database → Linter** (RLS-related **ERROR**s should disappear once scripts match the DB). **Production:** repeat the **same SQL order** in a **quiet window** only after staging is green → **`rls-post-deploy-hardening.sql`** → monitor **30–60 minutes** (company lists, Realtime, reminders).

### Recommended final action (staging rollout)

Do this next on your **staging project** or **DB branch**:

1. Follow the **Next action — staging rollout** paragraph above **exactly** (including script batches under **Order summary**).
2. Run **Quick verification** SQL after **each major batch** (subsection *Quick verification (staging SQL Editor)* below).
3. Run the **full smoke checklist**: companies (list, search, detail, create/edit), reminders (**own + assigned**), timeline, comments (+ attachments), notifications bell + **Realtime**, admin flows (trash bin, profiles / user management).
4. **`pnpm e2e`** (see [`production-deploy.md`](production-deploy.md)) and Supabase **Database → Linter** — RLS-related **ERROR**s should be resolved before you promote.
5. **Only then** proceed to **Production**: same SQL order in a **quiet window**, **`rls-post-deploy-hardening.sql`**, **30–60 minutes** monitoring.

**Phase 1 model (2026):** **Collaborative read** — authenticated users see all **active** (`deleted_at IS NULL`) `companies` / `contacts` (and related UX). **Row owners** (`user_id`) and users with **`profiles.role = 'admin'`** (via `public.is_app_admin()`) also see **trashed** rows where policies allow. **Writes** stay owner-scoped with admin override. Do **not** use JWT `auth.role() = 'admin'` in policies (normal Supabase JWT role is `authenticated`).

**Apply order** (staging first; snapshot policies / `relrowsecurity` via [`src/sql/rls-rollout-backup-queries.sql`](../src/sql/rls-rollout-backup-queries.sql); run each migration script in a single transaction where `BEGIN`/`COMMIT` are included):

1. [`src/sql/rls-helpers.sql`](../src/sql/rls-helpers.sql) — `public.is_app_admin()` (`SECURITY DEFINER`, fixed `search_path`; `EXECUTE` granted only to `authenticated`).
2. [`src/sql/core-crm-rls-collaborative.sql`](../src/sql/core-crm-rls-collaborative.sql) — `companies`, `contacts`, `reminders`, `timeline`, `email_log`, `email_templates`; drops legacy `dev_allow_all_inserts` and replaces older policy names where present.
3. [`src/sql/rls-profiles-settings-consolidate.sql`](../src/sql/rls-profiles-settings-consolidate.sql) — consolidated `profiles` / `user_settings` policies (fewer duplicate permissive policies).
4. Comments chain: [`src/sql/comments-rls.sql`](../src/sql/comments-rls.sql) → [`src/sql/comments-trash-alignment.sql`](../src/sql/comments-trash-alignment.sql) → [`src/sql/comments-attachments-delete-policy.sql`](../src/sql/comments-attachments-delete-policy.sql).
5. *(Optional but recommended)* [`src/sql/rls-post-deploy-hardening.sql`](../src/sql/rls-post-deploy-hardening.sql) — revoke/limit `EXECUTE` on internal helpers; lock down `search_path` where missing (see subsection *Post-deploy hardening*).
6. *(Performance)* [`src/sql/rls-planner-subselect-wrap.sql`](../src/sql/rls-planner-subselect-wrap.sql) — scalar-subquery wrap for `auth.uid()` / `is_app_admin()` in policies (same semantics; details in *Order summary* step 6).

### Order summary

Staging or DB branch — **same sequence on production** after staging is green:

1. `rls-helpers.sql`
2. `core-crm-rls-collaborative.sql`
3. `rls-profiles-settings-consolidate.sql`
4. Comments chain: `comments-rls.sql` → `comments-trash-alignment.sql` → `comments-attachments-delete-policy.sql`
5. *(Optional but recommended)* `rls-post-deploy-hardening.sql` — see Post-deploy hardening below
6. *(Performance)* [`src/sql/rls-planner-subselect-wrap.sql`](../src/sql/rls-planner-subselect-wrap.sql) — rewrites core CRM + comments + profiles policies so `auth.uid()` and `public.is_app_admin()` appear as `(SELECT …)` scalar subqueries (planner-friendly; behavior unchanged). Safe to apply **after** the collaborative RLS scripts above. On hosted Supabase this may be recorded as several migrations (`rls_planner_subselect_wrap_core_crm`, `…_reminders_timeline_email`, `…_profiles_settings`, `…_comments_attachments`); the repo keeps one transactional SQL file as the canonical definition.

**Historical:** [`src/sql/rls-setup.sql`](../src/sql/rls-setup.sql) is **superseded** (owner-only prototype); production uses `core-crm-rls-collaborative.sql`.

**Post-deploy hardening:** [`src/sql/rls-post-deploy-hardening.sql`](../src/sql/rls-post-deploy-hardening.sql) — revoke `EXECUTE` on internal `SECURITY DEFINER` functions from `anon`/`authenticated`; set `search_path` where missing (adjust signatures to match `pg_proc`). Run **after** the main RLS scripts succeed on an environment: optionally on **staging** first to prove `REVOKE`/`ALTER FUNCTION` statements match your catalog; **then on production** immediately after the production SQL rollout (same day), once smoke checks pass.

### Database linter snapshot (2026-05-01)

Run **Supabase → Database → Advisors** regularly after DDL changes. Snapshot from the linked CRM project:

**Security (representative)**

- **ERROR — RLS disabled but policies exist:** `feedback`, `pending_users`, `user_notifications` — enable RLS and reconcile policies, or drop stray policies. Track against your rollout checklist ([remediation](https://supabase.com/docs/guides/database/database-linter?lint=0007_policy_exists_rls_disabled)).
- **WARN — `SECURITY DEFINER` callable broadly:** several helpers (`get_crm_user_context`, `is_app_admin`, triggers, etc.) — align with [`rls-post-deploy-hardening.sql`](../src/sql/rls-post-deploy-hardening.sql) and role grants ([anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)).
- **WARN — function `search_path` mutable:** e.g. `update_updated_at_column`, `hybrid_company_search`, comment triggers — fix with `SET search_path` per function ([guide](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)).
- **WARN — Auth:** leaked-password protection, MFA breadth ([password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [MFA](https://supabase.com/docs/guides/auth/auth-mfa)).

**Performance (representative)**

- **INFO — unindexed foreign keys:** common on audit columns (`*_created_by`, `*_updated_by`, …) and `comments.entity_id` — add covering indexes when advisors show sustained impact ([lint](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)).
- **INFO — unused indexes:** treat as **cold-cache / low-traffic** signal until measured after realistic load; do not drop without `EXPLAIN`/`pg_stat_user_indexes` review ([lint](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)).

**Hot-path `EXPLAIN`:** repeatable templates for dashboard RPCs live in [`docs/perf/hot-paths-explain.md`](perf/hot-paths-explain.md).

### Staging → production rollout

**Staging first**

1. Apply scripts in the **exact order** above on **staging** or a **Supabase DB branch**, following [`src/sql/rls-rollout-backup-queries.sql`](../src/sql/rls-rollout-backup-queries.sql) for a pre-flight snapshot.
2. After **each major batch**, run **Quick verification** SQL (see subsection below), then the **smoke checklist** (normal user unless noted):
   - **`rls-helpers.sql`** — sanity only (optional quick verification SQL below).
   - **`core-crm-rls-collaborative.sql`** — company **list** / **search** / **detail** / **create** / **edit**; **reminders** (own + assigned); **timeline**; **mass-email log**; **notifications bell** + **Realtime**; smoke **OpenMap** if you use it.
   - **`rls-profiles-settings-consolidate.sql`** — **settings** / profile fields; **admin:** user-management touches that read `profiles`.
   - **Comments chain** — **comments** + **attachments** (create, view, delete attachment if applicable).
   - **Admin** (throughout): **trash bin**, **profiles** / admin-only flows.
3. **`pnpm e2e`** against staging (`E2E_*` in `.env.local` — see [`production-deploy.md`](production-deploy.md)).
4. Supabase **Database → Linter:** **RLS-related ERRORs** should clear once policies and `ENABLE ROW LEVEL SECURITY` match the scripts; resolve remaining ERRORs before production.

**Production** — only after staging is green: repeat the **same SQL order** during a **quiet window**, then **`rls-post-deploy-hardening.sql`** once immediate smoke is green; monitor 30–60 minutes (company lists, Realtime, reminders).

### Quick verification (staging SQL Editor)

After applying the scripts, run in the SQL Editor (expects `public` schema):

```sql
-- Expect relrowsecurity = true for each listed table after rollout
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN (
    'companies',
    'contacts',
    'reminders',
    'timeline',
    'comments',
    'comment_attachments'
  )
ORDER BY relname;

-- Helper function exists (scope to public schema)
SELECT p.proname, p.prosecdef AS security_definer
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'is_app_admin';
```

You should see **`relrowsecurity = true`** for those tables and **one row** for `is_app_admin` with `security_definer = true`.

**Monitoring after RLS**

- Watch **slow query** / Postgres logs (heavy company list queries with nested `contacts` are normal hotspots).
- Confirm **Realtime** still delivers events where the app subscribes (RLS applies to replication).
- Schedule a follow-up window for **unused indexes** and **`unindexed_foreign_keys`** (see §5 and Supabase linter INFO).

| Area | SELECT (phase 1) | Writes |
| --- | --- | --- |
| `companies`, `contacts` | Active rows for all `authenticated`; owner + admin see trashed rows too | Owner `user_id` or `is_app_admin()` |
| `reminders` | Active rows for everyone; owner, assignee (`assigned_to` compared to `auth.uid()::text`), admin | Owner, assignee, or admin as defined in SQL |
| `timeline` | Same pattern as core entities | Owner or admin |
| `email_log`, `email_templates` | Authenticated read per mass-email / templates UX | Owner or admin where `user_id` applies (`email_templates` has shared CRUD for authenticated in phase 1) |
| `comments` / `comment_attachments` | Threads on companies **visible like company SELECT** (active companies globally; trashed company rows for owner/admin) | **INSERT:** any authenticated user on an **active** company, `created_by = auth.uid()`. **UPDATE/DELETE:** **company record owner** (`companies.user_id`) or admin (moderation / trash); markdown edits remain author-only in [`src/lib/actions/comments.ts`](../src/lib/actions/comments.ts). **DELETE attachments:** author **or** company record owner **or** admin ([`comments-attachments-delete-policy.sql`](../src/sql/comments-attachments-delete-policy.sql)). |

The **service role** key bypasses RLS when used from trusted server code; it must never ship to the browser.

**`user_notifications`:** As in the [table section](#user_notifications) above — inserts from server using **service role**; clients read/update **own** rows only ([`user_notifications.sql`](../src/sql/user_notifications.sql)).

**Storage bucket `comment-files`:** [`storage-comment-files-bucket.sql`](../src/sql/storage-comment-files-bucket.sql) scopes blobs by company path (often **company record owner** for uploads). Postgres RLS now allows collaborative comments; if non-owners upload via the browser, revisit Storage policies in a follow-up migration.

**Performance:** After RLS is stable, address Supabase linter **`unindexed_foreign_keys`** and hot paths (see §5).

**Soft-delete (`deleted_at`, `deleted_by`)**: `companies`, `contacts`, `reminders`, `timeline`, and **`comments`** support optional soft deletion. On restore, `deleted_at` and `deleted_by` are cleared; hard deletes drop the row. **`deleted_by` FK differs by table:** on `companies`, `contacts`, `reminders`, and `timeline` it references **`auth.users(id)`** ([`deleted-by-audit.sql`](../src/sql/deleted-by-audit.sql)); on **`comments`** it references **`profiles(id)`** ([`comments-tables.sql`](../src/sql/comments-tables.sql)). Active reads typically filter `deleted_at IS NULL`; trashed rows appear in admin tooling or company-owner flows. Server actions and filters remain defense-in-depth beyond RLS.

**Admin Papierkorb UI**: The trash bin UI route is **`/admin/trash`** ([`AdminTrashBinCard`](../src/components/features/profile/AdminTrashBinCard.tsx)). It loads trashed rows with `deleted_by`, then resolves `profiles.display_name` in one batched query (`profiles` where `id IN (…)`); missing or null deleters show as “Unbekannt” in the “Gelöscht von” column (`safeDisplay`). Many destructive paths use **`createAdminClient`** (service role) and bypass RLS by design ([`src/lib/actions/crm-trash.ts`](../src/lib/actions/crm-trash.ts)).

**Detail routes**: `src/lib/actions/resolve-detail.ts` exposes `resolveReminderDetail` and `resolveTimelineDetail` (same pattern as `resolveCompanyDetail` / `resolveContactDetail`: fetch by id, `missing` if no row, `trashed` if `deleted_at` is set, else `active` with the typed row). Used by `/reminders/[id]` and `/timeline/[id]` server pages.

## 5. Performance indexes (summary)

- companies: `status`, `kundentyp`, `user_id`
- contacts: `company_id`, `user_id`, `(company_id + is_primary)`
- reminders: `company_id`, `due_date`, `status`, `user_id`
- timeline: `company_id`, `user_id`
- user_settings: `user_id`, `key`
- user_notifications: `(user_id, created_at DESC)`; partial `(user_id) WHERE read_at IS NULL` for unread lists — see [`user_notifications.sql`](../src/sql/user_notifications.sql)
- Soft-delete: composite `(user_id, deleted_at, deleted_by)` (replaces former two-column index) and partial “trashed” `(user_id) WHERE deleted_at IS NOT NULL` on `companies`, `contacts`, `reminders`, `timeline` — run `src/sql/soft-delete-trash.sql` then `src/sql/deleted-by-audit.sql`
- comments: `(entity_type, entity_id, created_at DESC) WHERE deleted_at IS NULL`; partial on `parent_id` for non-null parents among non-deleted rows — see `src/sql/comments-tables.sql`
- comment_attachments: `comment_id` — see `src/sql/comments-tables.sql`

## 6. Maintenance & Type Safety

### Maintenance

**Backfill `user_id` from `created_by` (one-time)**  
Historical imports or older app versions may leave `companies.user_id` / `contacts.user_id` null while `created_by` is set. The owner column in list UIs and RLS both expect `user_id` to match the responsible auth user (`profiles.id` / `auth.users.id`).

- **SQL (recommended for production):** run in the Supabase SQL Editor inside a maintenance window. Transaction wraps both tables:

  [`src/sql/backfill-user-id-from-created-by.sql`](../src/sql/backfill-user-id-from-created-by.sql)

- **Node (same logic, chunked updates):** requires `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`:

  ```bash
  pnpm backfill:user-id
  ```

Both paths are **idempotent** (only rows with `deleted_at IS NULL`, `user_id IS NULL`, and `created_by IS NOT NULL` are updated). Rows with **both** `user_id` and `created_by` null stay unchanged—assign manually if needed. Afterward, use the commented verification `SELECT` in the SQL file to confirm zero “still orphaned” rows.

---

Regenerate types after any **public** schema change:

```bash
pnpm supabase:types
```

This writes generated types to `src/types/supabase.ts` (consumed via `src/types/database.types.ts`).

Service layer pattern (example):

```ts
// Example – align imports with the current codebase
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export async function getCompanies(userId: string): Promise<Company[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("firmenname");

  if (error) throw handleSupabaseError(error);
  return data ?? [];
}
```

## 7. Zod Validations

The application uses Zod schemas for client-side form validation, ensuring data integrity before submission. These schemas are defined in `@/lib/validations/` and used with React Hook Form.

Key Zod schemas include:

- `companySchema` (`company.ts`): Full company row shape for forms, with `toCompanyInsert` / `toCompanyUpdate` for Supabase — **`land`** is ISO **3166-1 alpha-2** (uppercase) or **`null`**, validated with **`normalizeLandInput`** from `src/lib/countries/iso-land.ts` (preprocess / refine; `.strict()`, nullable handling per field rules)
- `parsedCompanyRowSchema` / `parsedCompanyRowsSchema` (`csv-import.ts`): Parsed CSV rows; **`land`** aligned with the same ISO normalization where applicable
- `contactSchema` (`contact.ts`): Contact fields with `toContactInsert` / `toContactUpdate`
- `reminderSchema` / `reminderFormSchema` (`reminder.ts`): Reminder fields (including form-only variants where applicable)
- `timelineSchema` (`timeline.ts`): `title`, `activity_type`, optional `content`, `company_id`, `contact_id`, `user_name` — matches the `timeline` table
- `emailTemplateSchema` (`email-template.ts`): Email template name, subject, body
- `profileDisplayNameSchema`, `profileAvatarSchema`, `parseProfileAvatarFile` (`profile.ts`): Display name and avatar URL / upload validation
- `notificationPreferencesSchema`, `trashBinPreferenceSchema` (`settings.ts`): User settings keys aligned with `user_settings`
- In-app `user_notifications` payload types (`notification.ts`): per-`type` JSON shapes for `payload` column
- `createCompanyCommentSchema`, `updateCommentSchema`, `deleteCommentSchema`, `restoreOwnCommentSchema` (`comment.ts`): Company comment create/update/delete/restore payloads for server actions (markdown length, UUIDs; maps to `comments` columns)

All schemas use `.strict()`, trimming, length limits, and enum constraints matching the database schema. Forms use `z.infer<typeof schema>` for TypeScript integration.

## 8. Auth & Authorization

Supabase Auth provides authentication with the `profiles` table as the single source of truth for user roles and display information. Roles are `user` or `admin`, enforced via RLS and server-side helpers (`requireUser()`, `requireAdmin()`). Authorization does not rely on `user_metadata` for roles; `display_name` and `avatar_url` are read from `profiles` in `getCurrentUser()` for the shell (sidebar, header) and profile page. `last_sign_in_at` on `profiles` is shown in admin user management when populated by the app.

## 9. Supabase Storage

### `avatars` bucket

Profile photos use **Storage**, not bytea columns in Postgres.

| Item | Detail |
|------|--------|
| Bucket id | `avatars` |
| Public | Yes (public URLs for `AvatarImage` / `next/image`) |
| Object path | `{user_uuid}/{user_uuid}-{timestamp}-{sanitized_filename}` — first path segment **must** equal `auth.uid()` for RLS |
| App validation | Server action checks that `avatar_url` starts with `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/{user.id}/` |

**One-time setup (new project or missing bucket)**  
Run the script in the Supabase SQL Editor (idempotent policies via `DROP POLICY IF EXISTS`):

- [`src/sql/storage-avatars-bucket.sql`](../src/sql/storage-avatars-bucket.sql)

That creates the bucket (if missing), sets it public, and adds policies so authenticated users can **insert/update/delete** only under their own `{uid}/` prefix and **anyone can read** objects in `avatars` (suitable for public avatar URLs).

**Operational notes**

- Without this bucket, the client upload API returns `StorageError: Bucket not found`.
- Table RLS for `profiles` is unchanged; only `avatar_url` text is updated.
- Related UI: `@/components/ui/avatar-upload.tsx` (profile card), header avatar in `@/components/layout/Header.tsx`.

### `comment-files` bucket (CRM comment attachments)

Private bucket for files attached to **company** comment threads. Metadata rows live in `comment_attachments.storage_object_path`; downloads use **signed URLs** from `getCommentAttachmentSignedUrl` — the server prefers **`createSignedUrl`** with the **service role** client (when `SUPABASE_SERVICE_ROLE_KEY` is set) so signing does not depend on Storage **`SELECT`** RLS visibility; session client fallback if absent. Clients must not expose the service key. **`deleteCommentAttachment`** deletes the Postgres row then removes the Storage object (**admin preferred**, browser fallback).

| Item | Detail |
|------|--------|
| Bucket id | `comment-files` |
| Public | No |
| Object path | `{company_uuid}/{comment_uuid}/{object_name}` — first segment must be a `companies.id` whose `user_id = auth.uid()` and `deleted_at IS NULL` (`split_part(name, '/', 1)` in policy — do **not** use `(storage.foldername(name))[1]` for this layout: the last path segment is the file, so `foldername()` targets the **comment** folder and `[1]` mismatches `companies.id`, causing RLS denial on upload) |
| Table link | `comment_attachments.storage_object_path` stores the path **relative to the bucket** (not the full URL) |

**One-time setup**  
Run in the Supabase SQL Editor (idempotent), in sensible order:

- [`src/sql/storage-comment-files-bucket.sql`](../src/sql/storage-comment-files-bucket.sql) — bucket + `storage.objects` policies  
- [`src/sql/comments-attachments-delete-policy.sql`](../src/sql/comments-attachments-delete-policy.sql) — **`DELETE`** on `public.comment_attachments` for comment authors (required for removing attachments when editing a note)

**Operational notes**

- Company **owner** (CRM `companies.user_id`) can **insert/select/update/delete** objects whose first path segment matches an owned company. Comment **authors** uploading on behalf of the owner still use paths under that company id (server/client validation in app code should align paths with `comments` / `comment_attachments` rows).
- Related UI (company detail): thread compose/upload in `@/components/features/companies/detail/CompanyCommentsCard.tsx` (with `CommentComposer` / `CommentItem`); company-wide attachment table in `@/components/features/companies/detail/CompanyCommentAttachmentsCard.tsx` (`listCompanyCommentAttachments` / signed open; “go to note” sets `?commentId=`).
- **Post-deploy patch (Apr 2026):** If browser uploads fail with Postgres `42501` / `"new row violates row-level security policy"` on **`storage.objects`**, re-run [`storage-comment-files-bucket.sql`](../src/sql/storage-comment-files-bucket.sql) (policies now use **`split_part(name::text, '/', 1)`**). Earlier drafts used `storage.foldername(name)[1]`, which does not resolve to **`companies.id`** for paths `companyId/commentId/file`.
- Without this bucket or policies, uploads to `comment-files` fail with `Bucket not found` or RLS denial.

## 10. Change Log

2026-03-20 Initial v5 snapshot
2026-03-21 Refined documentation, added index overview
2026-03-22 Added missing columns to companies table overview
2026-03-23 Added contacts, reminders, timeline, email_log, email_templates tables
2026-03-24 Updated enums and constraints section
2026-03-25 Completed RLS summary and performance indexes
2026-03-26 Final audit and type safety notes
2026-03-27 Added user_settings table

2026-03-30 Added `profiles` table for role management (user/admin) – long-term clean auth architecture
2026-03-31 Added Zod validations section for form schemas
2026-03-31 Added Auth & Authorization section summarizing Supabase Auth integration
2026-04-01 Updated schema to reflect new columns: added created_by, updated_by, deleted_at, search_vector, and additional fields in companies, contacts, reminders, timeline, email_log. Updated timeline to use activity_type and content instead of type and description. Added relationships to profiles via created_by and updated_by.

2026-04-07 Documented Storage `avatars` bucket, setup SQL, profile `avatar_url` flow, and `profileAvatarSchema`. Repaired RLS / indexes section formatting; aligned typegen docs with `pnpm supabase:types` → `src/types/supabase.ts`.

2026-04-08 Added `deleted_at` on `reminders` and `timeline` (with indexes), `user_settings` key `trash_bin_enabled`, admin Profile Papierkorb UI, and app-level soft/hard delete + restore + timeline audit. Migration: `src/sql/soft-delete-trash.sql`.

2026-04-09 Added nullable `deleted_by` → `auth.users(id)` on `companies`, `contacts`, `reminders`, `timeline`; composite indexes `(user_id, deleted_at, deleted_by)`; audit timeline titles include actor `display_name`; detail URLs for trashed company/contact redirect to list with toast. SQL: `src/sql/deleted-by-audit.sql`.

2026-04-10 Doc sync: `profiles.last_sign_in_at`; `contacts.is_primary` nullability vs generated types; Zod section aligned with `companySchema`, `timelineSchema`, `profileDisplayNameSchema`, and related modules under `@/lib/validations/`.

2026-04-12 Doc sync: full `companies.status` set (`kunde`, `partner`, `inaktiv`); timeline `updated_by` clarified (no `updated_at` on `timeline`); RLS summary no longer uses non-standard `auth.role()` pseudocode; Admin Papierkorb component path made explicit; audit stamp refreshed.

2026-04-21 Documented **`comments`** and **`comment_attachments`** (columns, indexes, triggers, FKs to `companies` / `profiles`), RLS behaviour before/after **`comments-trash-alignment.sql`**, Zod **`comment.ts`**, and `deleted_by` FK difference vs core tables. Linked SQL apply order for new environments.

2026-04-21 Added **`user_notifications`** (columns, RLS, Realtime, indexes), live RLS audit note for `reminders` / `timeline`, and SQL [`user_notifications.sql`](../src/sql/user_notifications.sql). Types via `pnpm supabase:types`.

2026-04-22 Documented **Maintenance** backfill for `user_id` from `created_by` (SQL + `pnpm backfill:user-id`): [`backfill-user-id-from-created-by.sql`](../src/sql/backfill-user-id-from-created-by.sql).

2026-04-23 Doc-only: header audit date; no schema change. Cross-refs: [`AIDER-RULES.md`](AIDER-RULES.md), [`architecture.md`](architecture.md) HTTP API inventory.

2026-04-24 Added [`profiles-table.sql`](../src/sql/profiles-table.sql) for bootstrapping `public.profiles` on empty DBs (prerequisite for `comments` FKs); documented apply order before `comments-tables.sql`.

2026-04-28 **Admin global in-app feed:** EAV key `notification_admin_global_in_app_feed` (per-admin opt-in, default off); server mirrors primary `user_notifications` inserts to opted-in admins via service role. Settings UI: `ClientSettingsPage` (admin only). Zod/validation unchanged; no new SQL files.

2026-04-28 **Transactional email parity:** For each successful `user_notifications` insert, optional German HTML/text email to `auth.users.email` when `notification_email_enabled` and SMTP are available; `src/lib/services/smtp-delivery.ts`, `src/lib/email/build-notification-email.ts`, `src/lib/notifications/in-app-action-path.ts`. Settings + i18n copy updated. No new SQL.

2026-04-28 **Vitest:** `src/lib/services/smtp-delivery.test.ts` exercises `getSystemSmtpConfigForNotifications` and `sendNotificationHtmlEmail` (mocked admin client + nodemailer) so coverage includes the delivery module; see `docs/testing-strategy.md`.

2026-04-28 **Comment attachments Phase A:** Private Storage bucket **`comment-files`** + RLS [`storage-comment-files-bucket.sql`](../src/sql/storage-comment-files-bucket.sql); `comment_attachments.storage_object_path` documented (§2, §4, §9). Postgres **DELETE** policy for `comment_attachments` was added in [`comments-attachments-delete-policy.sql`](../src/sql/comments-attachments-delete-policy.sql) (see **2026-04-29**).
2026-04-28 **Storage RLS:** `comment-files` policies use **`split_part(name::text, '/', 1)`** (not `storage.foldername(name)[1]`) so the first segment matches **`companies.id`** for object keys `companyId/commentId/filename`.

2026-04-30 **`companies.land`:** Documented canonical **ISO 3166-1 alpha-2** storage (uppercase / null), app module `src/lib/countries/iso-land.ts`, and ops script [`src/sql/normalize-companies-land-to-iso.sql`](../src/sql/normalize-companies-land-to-iso.sql). Zod section updated for `companySchema` / CSV import shapes.
2026-04-30 **Vitest:** [`iso-land.test.ts`](../src/lib/countries/iso-land.test.ts) (`normalizeLandInput`, display helpers, flags); [`company-filters-url-state.test.ts`](../src/lib/utils/company-filters-url-state.test.ts) (companies list URL + session persistence, incl. optional columns); [`companies-list-supabase.test.ts`](../src/lib/companies/companies-list-supabase.test.ts) (list filter applier + `fetchAllCompanyIdsForListNavigation`). Supports the global coverage thresholds in `vitest.config.ts`; see [`testing-strategy.md`](testing-strategy.md).
2026-04-29 **`comment_attachments` DELETE:** policy [`comments-attachments-delete-policy.sql`](../src/sql/comments-attachments-delete-policy.sql) (comment author **+** company owner context). App: `POST /api/comment-attachments/upload`, `deleteCommentAttachment`, `getCommentAttachmentSignedUrl` (preferred admin signing); client **`openSignedStorageUrl`** for tab vs Blob-download open behavior — docs/sync in [`architecture.md`](architecture.md) HTTP inventory.
