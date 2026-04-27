# AquaDock CRM – Supabase Schema v5

**Version**: 5.0 (March 2026)  
**Last audited**: 2026-04-23  
**Environment**: Supabase PostgreSQL 15+  

**Reading guide:** **Business readers** — use section 1 for “what each table is for.” **Developers** — sections 2–6 for columns, RLS, and indexes; section 6–7 for type generation and Zod alignment. **Operations** — Storage (`avatars`) and backup items in section 9 and deployment docs.

**Tenancy:** RLS and `user_id` on records model **per-user** ownership (and admin override where policies allow), not **multi-tenant org / workspace** objects. A future “org” or deal-pipeline layer would be additive schema on top of this v5 design.

## 1. Database Overview

| Table           | Purpose                   | ~Rows | PK   | Main Relations            | RLS  | Key Indexes                  |
| --------------- | ------------------------- | ----- | ---- | ------------------------- | ---- | ---------------------------- |
| companies       | Core business entities    | 450   | uuid | —                         | Yes  | status, user_id, kundentyp   |
| contacts        | Persons / decision makers | 1 200 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| reminders       | Tasks & follow-ups        | 320   | uuid | → companies.id (required) | Yes  | company_id, due_date, status |
| timeline        | Activity log              | 2 800 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| comments        | Threaded notes on companies | —   | uuid | → companies, self (parent), profiles | Yes | entity list, parent thread |
| comment_attachments | File metadata for a comment (future UI) | — | uuid | → comments, profiles | Yes | comment_id |
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
| land       | text        | true     | —                 | Country                                   | —             |
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

Optional attachment rows per comment (schema and RLS exist; product UI may follow later).

| Column               | Type        | Nullable | Default           | Business Meaning     | Notes / Index |
| -------------------- | ----------- | -------- | ----------------- | -------------------- | ------------- |
| id                   | uuid        | false    | gen_random_uuid() | Primary key          | PK            |
| comment_id           | uuid        | false    | —                 | Parent comment       | FK → comments (CASCADE), indexed |
| file_name            | text        | false    | —                 | Original file name   | —             |
| content_type         | text        | true     | —                 | MIME type            | —             |
| byte_size            | bigint      | true     | —                 | Size in bytes        | —             |
| storage_object_path  | text        | false    | —                 | Path in Storage (TBD) | —             |
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

Policies are **per table** in migrations; the following is **illustrative** only (do not paste as SQL):

```text
-- Typical ideas: row belongs to auth.uid(), or belongs to a company owned by auth.uid()
-- Admin or service-role access is expressed with your project’s JWT / custom claims — inspect live policies in Supabase.
(auth.uid() = user_id)
OR (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
-- + admin / service paths as defined in SQL migrations
```

The **service role** key bypasses RLS when used from trusted server code; it must never ship to the browser.

**Live RLS audit (in-app notifications prerequisite, 2026-04-21, hosted project):** On the current database, `public.reminders` and `public.timeline` report `relrowsecurity = false` (no policies in `pg_policies` for those names). `comments` is owner-scoped via `companies.user_id = auth.uid()`. **Implication:** assignees and cross-tenant “activity on my company” behaviour depend on whether you enable RLS on `reminders` / `timeline` in production. When you turn RLS on for `reminders`, add a **minimal** `SELECT` policy so an assignee can read a row if `assigned_to` matches the user (store `auth.users` id as `text` in `assigned_to` and compare to `auth.uid()::text`, or cast consistently). The repo’s older [`src/sql/rls-setup.sql`](../src/sql/rls-setup.sql) is not necessarily applied verbatim on the live project — verify with `pg_policies` and `pg_class.relrowsecurity` after migrations.

**`user_notifications`:** RLS as in the [table section](#user_notifications) above; inserts from server using service role only.

**`comments` and `comment_attachments`:** Policies tie access to **company ownership** (`companies.user_id = auth.uid()`), same idea as core CRM tables. After [`comments-trash-alignment.sql`](../src/sql/comments-trash-alignment.sql): **SELECT** includes soft-deleted comments for the company owner (so trash / restore flows work under RLS). **INSERT** still requires `created_by = auth.uid()` and an active (non-deleted) company. **UPDATE** / **DELETE** are allowed for the **company owner** on any comment on that company (restore and hard-delete); the app still restricts **markdown edits** to the original author in server actions (`@/lib/actions/comments.ts`). **Attachments:** SELECT/INSERT mirror comment + company access; there is no UPDATE/DELETE policy yet—extend if you add attachment management.

**Soft-delete (`deleted_at`, `deleted_by`)**: `companies`, `contacts`, `reminders`, `timeline`, and **`comments`** support optional soft deletion. On restore, `deleted_at` and `deleted_by` are cleared; hard deletes drop the row. **`deleted_by` FK differs by table:** on `companies`, `contacts`, `reminders`, and `timeline` it references **`auth.users(id)`** ([`deleted-by-audit.sql`](../src/sql/deleted-by-audit.sql)); on **`comments`** it references **`profiles(id)`** ([`comments-tables.sql`](../src/sql/comments-tables.sql)). Active reads typically filter `deleted_at IS NULL`; trashed rows appear in admin tooling or company-owner flows. For the core four tables, RLS was not extended solely for soft-delete—rely on server actions and query filters where documented.

**Admin Papierkorb UI**: The profile Trash Bin table loads trashed rows with `deleted_by`, then resolves `profiles.display_name` in one batched query (`profiles` where `id IN (…)`); missing or null deleters show as “Unbekannt” in the “Gelöscht von” column (`src/components/features/profile/AdminTrashBinCard.tsx`, `safeDisplay`).

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

- `companySchema` (`company.ts`): Full company row shape for forms, with `toCompanyInsert` / `toCompanyUpdate` for Supabase
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

## 9. Supabase Storage – `avatars` bucket

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
