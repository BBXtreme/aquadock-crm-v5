# AquaDock CRM – Supabase Schema v5

**Version**: 5.0 (March 2026)  
**Last audited**: 2026-04-10  
**Environment**: Supabase PostgreSQL 15+  

**Reading guide:** **Business readers** — use section 1 for “what each table is for.” **Developers** — sections 2–6 for columns, RLS, and indexes; section 6–7 for type generation and Zod alignment. **Operations** — Storage (`avatars`) and backup items in section 9 and deployment docs.

## 1. Database Overview

| Table           | Purpose                   | ~Rows | PK   | Main Relations            | RLS  | Key Indexes                  |
| --------------- | ------------------------- | ----- | ---- | ------------------------- | ---- | ---------------------------- |
| companies       | Core business entities    | 450   | uuid | —                         | Yes  | status, user_id, kundentyp   |
| contacts        | Persons / decision makers | 1 200 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| reminders       | Tasks & follow-ups        | 320   | uuid | → companies.id (required) | Yes  | company_id, due_date, status |
| timeline        | Activity log              | 2 800 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| email_log       | Outgoing email tracking   | 1 900 | uuid | —                         | Yes  | —                            |
| email_templates | Reusable email templates  | 18    | uuid | —                         | Yes  | name (unique)                |
| user_settings   | User preferences          | 50    | uuid | user_id                   | Yes  | user_id, key                 |
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
| status     | text        | false    | 'lead'            | lead, interessant, qualifiziert, gewonnen, verloren, … | Indexed       |
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
| created_by | uuid        | true     | —                 | Created by user (profiles.id) | —             |
| updated_by | uuid        | true     | —                 | Updated by user (profiles.id) | —             |
| deleted_at | timestamptz | true     | —                 | Soft-delete (Papierkorb) | Indexed       |
| deleted_by | uuid        | true     | —                 | User who soft-deleted    | FK → auth.users |
| created_at | timestamptz | true     | now()             | —                        | —             |

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

**Known `key` values (EAV)**: `notification_preferences` (JSON object), `trash_bin_enabled` (JSON boolean; absent row ⇒ Papierkorb enabled). Soft-delete visibility is enforced in the **application** (PostgREST filters on `deleted_at`), not by additional RLS policies for this feature.

### profiles

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

- `companies.status`: `'lead' | 'interessant' | 'qualifiziert' | 'akquise' | 'angebot' | 'gewonnen' | 'verloren'`
- `reminders.priority`: `'hoch' | 'normal' | 'niedrig'`
- `reminders.status`: `'open' | 'closed'`

## 4. Row Level Security (RLS) – Summary

All tables use the same pattern:

```sql
-- Read / Update / Delete
(auth.uid() = user_id)
OR
(company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
OR
(auth.role() IN ('admin', 'service_role'))

-- Insert: WITH CHECK (auth.uid() = user_id)
```

Admin and `service_role` bypass for maintenance and migrations where applicable.

**Soft-delete (`deleted_at`, `deleted_by`)**: `companies`, `contacts`, `reminders`, and `timeline` support optional soft deletion. On soft delete the app sets `deleted_by` to the acting `auth.users` id; on restore both `deleted_at` and `deleted_by` are cleared. Hard deletes remove rows and do not use `deleted_by`. Active reads use `.is("deleted_at", null)`; trashed rows are listed only in admin tooling. RLS was **not** extended for these columns in this iteration—rely on server actions and query filters.

**Admin Papierkorb UI**: The profile Trash Bin table loads trashed rows with `deleted_by`, then resolves `profiles.display_name` in one batched query (`profiles` where `id IN (…)`); missing or null deleters show as “Unbekannt” in the “Gelöscht von” column (`AdminTrashBinCard`, `safeDisplay`).

**Detail routes**: `src/lib/actions/resolve-detail.ts` exposes `resolveReminderDetail` and `resolveTimelineDetail` (same pattern as `resolveCompanyDetail` / `resolveContactDetail`: fetch by id, `missing` if no row, `trashed` if `deleted_at` is set, else `active` with the typed row). Used by `/reminders/[id]` and `/timeline/[id]` server pages.

## 5. Performance indexes (summary)

- companies: `status`, `kundentyp`, `user_id`
- contacts: `company_id`, `user_id`, `(company_id + is_primary)`
- reminders: `company_id`, `due_date`, `status`, `user_id`
- timeline: `company_id`, `user_id`
- user_settings: `user_id`, `key`
- Soft-delete: composite `(user_id, deleted_at, deleted_by)` (replaces former two-column index) and partial “trashed” `(user_id) WHERE deleted_at IS NOT NULL` on `companies`, `contacts`, `reminders`, `timeline` — run `src/sql/soft-delete-trash.sql` then `src/sql/deleted-by-audit.sql`

## 6. Maintenance & Type Safety

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
