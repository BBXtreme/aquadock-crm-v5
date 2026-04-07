# AquaDock CRM – Supabase Schema v5

**Version**: 5.0 (March 2026)  
**Last audited**: 2026-04-07  
**Environment**: Supabase PostgreSQL 15+  

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
| status     | text        | false    | 'lead'            | lead, interessannt, qualifiziert, gewonnen, verloren, … | Indexed       |
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
| is_primary  | boolean     | false    | false             | Primary contact flag          | —             |
| user_id     | uuid        | true     | —                 | Owner (auth.uid())            | Indexed       |
| created_by  | uuid        | true     | —                 | Created by user (profiles.id) | —             |
| updated_by  | uuid        | true     | —                 | Updated by user (profiles.id) | —             |
| created_at  | timestamptz | true     | now()             | —                             | —             |
| updated_at  | timestamptz | true     | now()             | —                             | —             |
| deleted_at  | timestamptz | true     | —                 | Soft delete timestamp         | —             |

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

### profiles

| Column       | Type        | Nullable | Default | Business Meaning         | Notes / Index    |
| ------------ | ----------- | -------- | ------- | ------------------------ | ---------------- |
| id           | uuid        | false    | —       | References auth.users.id | PK, FK           |
| role         | text        | false    | 'user'  | User role (user / admin) | CHECK constraint |
| display_name | text        | true     | —       | Display name for UI      | —                |
| avatar_url   | text        | true     | —       | Profile picture URL      | —                |
| created_at   | timestamptz | false    | now()   | Creation timestamp       | —                |
| updated_at   | timestamptz | false    | now()   | Last update timestamp    | —                |

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

## 5. Performance indexes (summary)

- companies: `status`, `kundentyp`, `user_id`
- contacts: `company_id`, `user_id`, `(company_id + is_primary)`
- reminders: `company_id`, `due_date`, `status`, `user_id`
- timeline: `company_id`, `user_id`
- user_settings: `user_id`, `key`

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

- `firmendatenSchema`: Validates company legal data (firmenname, rechtsform, kundentyp, etc.)
- `adresseSchema`: Validates address fields (strasse, plz, stadt, bundesland, land)
- `aquadockSchema`: Validates AquaDock-specific fields (firmentyp, status, value)
- `contactSchema`: Validates contact information (vorname, nachname, email, telefon, etc.)
- `reminderSchema`: Validates reminder fields (title, due_date, priority, status, description)
- `timelineEntrySchema`: Validates timeline entry fields (type, title, description)
- `displayNameSchema`: Validates user display name (profile form)
- `profileAvatarSchema` / `parseProfileAvatarFile` (`@/lib/validations/profile.ts`): Validates `avatar_url` for server updates and file size/MIME before client upload

All schemas include trimming, length limits, and enum constraints matching the database schema. Forms use `z.infer<typeof schema>` for TypeScript integration.

## 8. Auth & Authorization

Supabase Auth provides authentication with the `profiles` table as the single source of truth for user roles and display information. Roles are `user` or `admin`, enforced via RLS and server-side helpers (`requireUser()`, `requireAdmin()`). Authorization does not rely on `user_metadata` for roles; `display_name` and `avatar_url` are read from `profiles` in `getCurrentUser()` for the shell (sidebar, header) and profile page.

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
