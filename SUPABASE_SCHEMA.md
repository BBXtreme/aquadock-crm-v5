# AquaDock CRM – Supabase Schema (March 2026)

## Existing Tables (real in Supabase)

| table_name      | column_name     | data_type                | is_nullable | column_default      | column_comment                                        | is_primary_key | foreign_key_to |
| :-------------- | --------------- | ------------------------ | ----------- | ------------------- | ----------------------------------------------------- | -------------- | -------------- |
| companies       | id              | uuid                     | NO          | uuid_generate_v4()  | z.B. restaurant, hotel, marina, segelschule, sonstige | YES            | null           |
| companies       | firmenname      | text                     | NO          | null                | Offizieller Firmenname                                | NO             | null           |
| companies       | rechtsform      | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | kundentyp       | text                     | NO          | 'sonstige'::text    | z.B. hotels-resorts, marinas, camping, sonstige       | NO             | null           |
| companies       | firmentyp       | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | strasse         | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | plz             | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | stadt           | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | bundesland      | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | land            | text                     | YES         | 'Deutschland'::text | null                                                  | NO             | null           |
| companies       | website         | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | telefon         | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | email           | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | wasserdistanz   | real                     | YES         | null                | null                                                  | NO             | null           |
| companies       | wassertyp       | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | lat             | real                     | YES         | null                | null                                                  | NO             | null           |
| companies       | lon             | real                     | YES         | null                | null                                                  | NO             | null           |
| companies       | osm             | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | import_batch    | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | status          | text                     | NO          | 'lead'::text        | lead, gewinnen, verloren, sonstige                    | NO             | null           |
| companies       | value           | bigint                   | YES         | 0                   | Geschätzter Projektwert in Euro                       | NO             | null           |
| companies       | notes           | text                     | YES         | null                | null                                                  | NO             | null           |
| companies       | created_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| companies       | updated_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| companies       | user_id         | uuid                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | id              | uuid                     | NO          | uuid_generate_v4()  | null                                                  | YES            | null           |
| contacts        | company_id      | uuid                     | YES         | null                | null                                                  | NO             | companies.id   |
| contacts        | anrede          | text                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | vorname         | text                     | NO          | null                | null                                                  | NO             | null           |
| contacts        | nachname        | text                     | NO          | null                | null                                                  | NO             | null           |
| contacts        | position        | text                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | email           | text                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | telefon         | text                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | mobil           | text                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | durchwahl       | text                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | is_primary      | boolean                  | YES         | false               | null                                                  | NO             | null           |
| contacts        | notes           | text                     | YES         | null                | null                                                  | NO             | null           |
| contacts        | created_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| contacts        | updated_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| contacts        | user_id         | uuid                     | YES         | null                | null                                                  | NO             | null           |
| email_log       | id              | uuid                     | NO          | uuid_generate_v4()  | null                                                  | YES            | null           |
| email_log       | template_name   | text                     | YES         | null                | null                                                  | NO             | null           |
| email_log       | recipient_email | text                     | NO          | null                | null                                                  | NO             | null           |
| email_log       | recipient_name  | text                     | YES         | null                | null                                                  | NO             | null           |
| email_log       | subject         | text                     | YES         | null                | null                                                  | NO             | null           |
| email_log       | status          | text                     | YES         | 'sent'::text        | null                                                  | NO             | null           |
| email_log       | error_msg       | text                     | YES         | null                | null                                                  | NO             | null           |
| email_log       | sent_at         | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| email_templates | id              | uuid                     | NO          | uuid_generate_v4()  | null                                                  | YES            | null           |
| email_templates | name            | text                     | NO          | null                | null                                                  | NO             | null           |
| email_templates | subject         | text                     | NO          | null                | null                                                  | NO             | null           |
| email_templates | body            | text                     | NO          | null                | null                                                  | NO             | null           |
| email_templates | created_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| email_templates | updated_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| reminders       | id              | uuid                     | NO          | uuid_generate_v4()  | null                                                  | YES            | null           |
| reminders       | company_id      | uuid                     | NO          | null                | null                                                  | NO             | companies.id   |
| reminders       | title           | text                     | NO          | null                | null                                                  | NO             | null           |
| reminders       | description     | text                     | YES         | null                | null                                                  | NO             | null           |
| reminders       | due_date        | timestamp with time zone | NO          | null                | null                                                  | NO             | null           |
| reminders       | priority        | text                     | YES         | 'normal'::text      | hoch, normal, niedrig                                 | NO             | null           |
| reminders       | status          | text                     | YES         | 'open'::text        | null                                                  | NO             | null           |
| reminders       | assigned_to     | text                     | YES         | 'Ich'::text         | null                                                  | NO             | null           |
| reminders       | created_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| reminders       | completed_at    | timestamp with time zone | YES         | null                | null                                                  | NO             | null           |
| reminders       | user_id         | uuid                     | YES         | null                | null                                                  | NO             | null           |
| timeline        | id              | uuid                     | NO          | uuid_generate_v4()  | null                                                  | YES            | null           |
| timeline        | company_id      | uuid                     | NO          | null                | null                                                  | NO             | companies.id   |
| timeline        | activity_type   | text                     | NO          | null                | null                                                  | NO             | null           |
| timeline        | title           | text                     | NO          | null                | null                                                  | NO             | null           |
| timeline        | content         | text                     | YES         | null                | null                                                  | NO             | null           |
| timeline        | user_name       | text                     | YES         | 'System'::text      | null                                                  | NO             | null           |
| timeline        | created_at      | timestamp with time zone | YES         | now()               | null                                                  | NO             | null           |
| timeline        | user_id         | uuid                     | YES         | null                | null                                                  | NO             | null           |



## Indexes & RLS Policies

- companies: idx_companies_status (on status)
- RLS: enabled on companies (user_id = auth.uid())

### Indexes & RLS info

| schemaname | tablename       | indexname                | indexdef                                                     |
| ---------- | --------------- | ------------------------ | ------------------------------------------------------------ |
| public     | companies       | companies_pkey           | CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id) |
| public     | companies       | idx_companies_status     | CREATE INDEX idx_companies_status ON public.companies USING btree (status) |
| public     | companies       | idx_companies_kundentyp  | CREATE INDEX idx_companies_kundentyp ON public.companies USING btree (kundentyp) |
| public     | companies       | idx_companies_user_id    | CREATE INDEX idx_companies_user_id ON public.companies USING btree (user_id) |
| public     | contacts        | contacts_pkey            | CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id) |
| public     | contacts        | idx_contacts_company_id  | CREATE INDEX idx_contacts_company_id ON public.contacts USING btree (company_id) |
| public     | contacts        | idx_contacts_is_primary  | CREATE INDEX idx_contacts_is_primary ON public.contacts USING btree (company_id, is_primary) |
| public     | contacts        | idx_contacts_user_id     | CREATE INDEX idx_contacts_user_id ON public.contacts USING btree (user_id) |
| public     | email_log       | email_log_pkey           | CREATE UNIQUE INDEX email_log_pkey ON public.email_log USING btree (id) |
| public     | email_templates | email_templates_pkey     | CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id) |
| public     | email_templates | email_templates_name_key | CREATE UNIQUE INDEX email_templates_name_key ON public.email_templates USING btree (name) |
| public     | reminders       | reminders_pkey           | CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id) |
| public     | reminders       | idx_reminders_company_id | CREATE INDEX idx_reminders_company_id ON public.reminders USING btree (company_id) |
| public     | reminders       | idx_reminders_status     | CREATE INDEX idx_reminders_status ON public.reminders USING btree (status) |
| public     | reminders       | idx_reminders_due_date   | CREATE INDEX idx_reminders_due_date ON public.reminders USING btree (due_date) |
| public     | reminders       | idx_reminders_user_id    | CREATE INDEX idx_reminders_user_id ON public.reminders USING btree (user_id) |
| public     | timeline        | timeline_pkey            | CREATE UNIQUE INDEX timeline_pkey ON public.timeline USING btree (id) |
| public     | timeline        | idx_timeline_user_id     | CREATE INDEX idx_timeline_user_id ON public.timeline USING btree (user_id) |
| public     | timeline        | idx_timeline_company_id  | CREATE INDEX idx_timeline_company_id ON public.timeline USING btree (company_id) |

## RLS Policies

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

## Generated TypeScript Types
See: src/lib/supabase/database.types.ts
Example usage:
type Company = Database['public']['Tables']['companies']['Row'];



## Mock / Planned Tables (not yet in DB)

- ...tbd



## Update Instructions
1. supabase db dump --schema public > temp.sql

2. Update table here

3. npx supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts

   

Last updated: 2026-03-20
