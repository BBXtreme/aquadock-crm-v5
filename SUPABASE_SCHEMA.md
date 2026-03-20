# AquaDock CRM – Supabase Schema Documentation

**Version**: v5 (March 2026)  
**Last updated**: 2026-03-20  
**Source**: Supabase CLI dump + SQL queries + manual review  
**Generated types**: `src/lib/supabase/database.types.ts`  
**Service layer**: `src/lib/supabase/services/` (CRUD wrappers with error handling)

## 1. Summary

| Table           | Description              | Rows (approx) | PK        | Main FKs                  | RLS? | Indexes? |
| --------------- | ------------------------ | ------------- | --------- | ------------------------- | ---- | -------- |
| companies       | Core company data        | ~450          | id (uuid) | —                         | Yes  | Yes      |
| contacts        | People / decision makers | ~1,200        | id (uuid) | → companies.id            | Yes  | Yes      |
| reminders       | Tasks & follow-ups       | ~320          | id (uuid) | → companies.id            | Yes  | Yes      |
| timeline        | Activity history         | ~2,800        | id (uuid) | → companies.id (nullable) | Yes  | Yes      |
| email_log       | Sent email tracking      | ~1,900        | id (uuid) | —                         | Yes  | —        |
| email_templates | Reusable templates       | ~18           | id (uuid) | —                         | Yes  | —        |

## 2. Detailed Schemas

### companies
**Primary Key**: id (uuid)  
**Description**: Main entity for companies/harbours/resorts/etc.

| Column        | Type        | Nullable | Default            | Comment / Business Meaning                                   | Constraints / Indexes |
| ------------- | ----------- | -------- | ------------------ | ------------------------------------------------------------ | --------------------- |
| id            | uuid        | NO       | uuid_generate_v4() | Unique record ID                                             | PK                    |
| firmenname    | text        | NO       | —                  | Official company name                                        | —                     |
| rechtsform    | text        | YES      | —                  | Legal form (GmbH, AG, e.K., etc.)                            | —                     |
| kundentyp     | text        | NO       | 'sonstige'         | Category: restaurant, hotel, marina, camping, segelschule, sonstige | —                     |
| firmentyp     | text        | YES      | —                  | Chain vs. independent                                        | —                     |
| strasse       | text        | YES      | —                  | Street address                                               | —                     |
| plz           | text        | YES      | —                  | Postal code                                                  | —                     |
| stadt         | text        | YES      | —                  | City                                                         | —                     |
| bundesland    | text        | YES      | —                  | Federal state                                                | —                     |
| land          | text        | YES      | 'Deutschland'      | Country                                                      | —                     |
| website       | text        | YES      | —                  | Website URL                                                  | —                     |
| telefon       | text        | YES      | —                  | Phone                                                        | —                     |
| email         | text        | YES      | —                  | Main email                                                   | —                     |
| wasserdistanz | real        | YES      | —                  | Distance to nearest water [km]                               | —                     |
| wassertyp     | text        | YES      | —                  | Sea, lake, river, canal                                      | —                     |
| lat           | real        | YES      | —                  | Latitude                                                     | —                     |
| lon           | real        | YES      | —                  | Longitude                                                    | —                     |
| osm           | text        | YES      | —                  | OpenStreetMap node/way/relation ID                           | —                     |
| import_batch  | text        | YES      | —                  | Import batch identifier (for deduplication)                  | —                     |
| status        | text        | NO       | 'lead'             | lead, interessant, qualifiziert, akquise, angebot, gewonnen, verloren | Index                 |
| value         | bigint      | YES      | 0                  | Estimated project value [€]                                  | —                     |
| notes         | text        | YES      | —                  | Internal notes                                               | —                     |
| created_at    | timestamptz | YES      | now()              | Record creation time                                         | —                     |
| updated_at    | timestamptz | YES      | now()              | Last update time                                             | —                     |
| user_id       | uuid        | YES      | —                  | Owning user (auth.uid())                                     | Index                 |

(Repeat similar blocks for contacts, reminders, timeline, email_log, email_templates — use your existing data)

## 3. Relationships & Joins

- contacts.company_id → companies.id (nullable)
- reminders.company_id → companies.id (required)
- timeline.company_id → companies.id (nullable – global events possible)

## 4. Indexes & Performance

- companies: idx_companies_status (on status)
- companies: idx_companies_user_id (on user_id)
- contacts: idx_contacts_company_id (on company_id)
- reminders: idx_reminders_company_id (on company_id)
- reminders: idx_reminders_due_date (on due_date)
- timeline: idx_timeline_company_id (on company_id)

| schemaname | tablename       | indexname                | indexdef                                                     |
| ---------- | --------------- | ------------------------ | ------------------------------------------------------------ |
| public     | companies       | companies_pkey           | CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id) |
| public     | companies       | idx_companies_kundentyp  | CREATE INDEX idx_companies_kundentyp ON public.companies USING btree (kundentyp) |
| public     | companies       | idx_companies_status     | CREATE INDEX idx_companies_status ON public.companies USING btree (status) |
| public     | companies       | idx_companies_user_id    | CREATE INDEX idx_companies_user_id ON public.companies USING btree (user_id) |
| public     | contacts        | contacts_pkey            | CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id) |
| public     | contacts        | idx_contacts_company_id  | CREATE INDEX idx_contacts_company_id ON public.contacts USING btree (company_id) |
| public     | contacts        | idx_contacts_is_primary  | CREATE INDEX idx_contacts_is_primary ON public.contacts USING btree (company_id, is_primary) |
| public     | contacts        | idx_contacts_user_id     | CREATE INDEX idx_contacts_user_id ON public.contacts USING btree (user_id) |
| public     | email_log       | email_log_pkey           | CREATE UNIQUE INDEX email_log_pkey ON public.email_log USING btree (id) |
| public     | email_templates | email_templates_name_key | CREATE UNIQUE INDEX email_templates_name_key ON public.email_templates USING btree (name) |
| public     | email_templates | email_templates_pkey     | CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id) |
| public     | reminders       | idx_reminders_company_id | CREATE INDEX idx_reminders_company_id ON public.reminders USING btree (company_id) |
| public     | reminders       | idx_reminders_due_date   | CREATE INDEX idx_reminders_due_date ON public.reminders USING btree (due_date) |
| public     | reminders       | idx_reminders_status     | CREATE INDEX idx_reminders_status ON public.reminders USING btree (status) |
| public     | reminders       | idx_reminders_user_id    | CREATE INDEX idx_reminders_user_id ON public.reminders USING btree (user_id) |
| public     | reminders       | reminders_pkey           | CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id) |
| public     | timeline        | idx_timeline_company_id  | CREATE INDEX idx_timeline_company_id ON public.timeline USING btree (company_id) |
| public     | timeline        | idx_timeline_user_id     | CREATE INDEX idx_timeline_user_id ON public.timeline USING btree (user_id) |
| public     | timeline        | timeline_pkey            | CREATE UNIQUE INDEX timeline_pkey ON public.timeline USING btree (id) |

## 5. Row Level Security (RLS)

- All tables: enabled
- Policy pattern: `auth.uid() = user_id` or `company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())`

| tablename | policyname                 | roles    | cmd    | qual                                                         | with_check             |
| --------- | -------------------------- | -------- | ------ | ------------------------------------------------------------ | ---------------------- |
| companies | users_delete_own_companies | {public} | DELETE | ((auth.uid() = user_id) OR (auth.role() = ANY (ARRAY['admin'::text, 'service_role'::text]))) | null                   |
| companies | users_insert_own_companies | {public} | INSERT | null                                                         | (auth.uid() = user_id) |
| companies | users_read_own_companies   | {public} | SELECT | ((auth.uid() = user_id) OR (auth.role() = ANY (ARRAY['admin'::text, 'service_role'::text]))) | null                   |
| companies | users_update_own_companies | {public} | UPDATE | ((auth.uid() = user_id) OR (auth.role() = ANY (ARRAY['admin'::text, 'service_role'::text]))) | null                   |
| contacts  | users_delete_own_contacts  | {public} | DELETE | ((auth.uid() = user_id) OR (auth.role() = ANY (ARRAY['admin'::text, 'service_role'::text]))) | null                   |
| contacts  | users_insert_own_contacts  | {public} | INSERT | null                                                         | (auth.uid() = user_id) |
| contacts  | users_read_own_contacts    | {public} | SELECT | ((auth.uid() = user_id) OR (auth.role() = ANY (ARRAY['admin'::text, 'service_role'::text]))) | null                   |
| contacts  | users_update_own_contacts  | {public} | UPDATE | ((auth.uid() = user_id) OR (auth.role() = ANY (ARRAY['admin'::text, 'service_role'::text]))) | null                   |

## 6. Type Safety & Services

- All queries use generated types: `src/lib/supabase/database.types.ts`
- Centralized service layer: `src/lib/supabase/services/{table}.ts`
- Error handling: consistent via `handleSupabaseError()`

## 5. Enums / Status Values

- companies.status: lead, interessant, qualifiziert, akquise, angebot, gewonnen, verloren
- reminders.priority: hoch, normal, niedrig
- reminders.status: open, closed
- email_log.status: sent, failed, pending

## 6. Type Safety & Service Layer

- All queries use generated types: `src/lib/supabase/database.types.ts`
- Centralized services: `src/lib/supabase/services/{table}.ts`
- Error handling: `handleSupabaseError()` in `client.ts`

## 7. Change Log & Update Instructions

- **2026-03-20**: Initial schema snapshot + types generation
- **Next change**: Add new columns/tables → re-run `npx supabase gen types` & update this file

## 8. Entity Relationship Overview (Text)

companies (1) ───┬─── (N) contacts                 ├─── (N) reminders                 └─── (N) timeline (nullable) email_templates (1) ───┬─── (N) email_log (via template_name)

![mermaid-diagram](/Users/marco/Downloads/mermaid-diagram.svg)
