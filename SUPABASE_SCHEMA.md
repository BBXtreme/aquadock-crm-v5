# AquaDock CRM Supabase Schema

## Tables

### companies
- id: uuid (primary key)
- firmenname: text
- rechtsform: text | null
- kundentyp: text
- firmentyp: text | null
- strasse: text | null
- plz: text | null
- stadt: text | null
- bundesland: text | null
- land: text | null
- website: text | null
- telefon: text | null
- email: text | null
- wasserdistanz: real | null
- wassertyp: text | null
- lat: real | null
- lon: real | null
- osm: text | null
- import_batch: text | null
- status: text (lead, won, lost, sonstige)
- value: bigint | null
- notes: text | null
- created_at: timestamp with time zone | null
- updated_at: timestamp with time zone | null
- user_id: uuid | null

### contacts
- id: uuid (primary key)
- company_id: uuid | null (foreign key to companies.id)
- anrede: text | null
- vorname: text
- nachname: text
- position: text | null
- email: text | null
- telefon: text | null
- mobil: text | null
- durchwahl: text | null
- is_primary: boolean
- notes: text | null
- created_at: timestamp with time zone | null
- updated_at: timestamp with time zone | null
- user_id: uuid | null

### reminders
- id: uuid (primary key)
- company_id: uuid (foreign key to companies.id)
- title: text
- description: text | null
- due_date: timestamp with time zone
- priority: text (high, normal, low)
- status: text (open, closed)
- assigned_to: text
- created_at: timestamp with time zone | null
- completed_at: timestamp with time zone | null
- user_id: uuid | null

### email_log
- id: uuid (primary key)
- template_name: text | null
- recipient_email: text
- recipient_name: text | null
- subject: text | null
- status: text (sent, failed, etc.)
- error_msg: text | null
- sent_at: timestamp with time zone

### email_templates
- id: uuid (primary key)
- name: text
- subject: text
- body: text
- created_at: timestamp with time zone | null
- updated_at: timestamp with time zone | null

### timeline
- id: uuid (primary key)
- company_id: uuid | null (foreign key to companies.id, nullable for global events)
- activity_type: text (email, call, meeting)
- title: text
- content: text | null
- user_name: text
- created_at: timestamp with time zone | null
- user_id: uuid | null

## Relationships
- contacts.company_id -> companies.id
- reminders.company_id -> companies.id
- timeline.company_id -> companies.id (nullable)

## Service Layer
The application uses a centralized Supabase service layer located in `src/lib/supabase/services/`.
Each table has corresponding service functions for CRUD operations, with proper TypeScript typing and error handling.
Services support both server-side (default) and client-side usage by accepting an optional Supabase client parameter.

## Type Safety
All database operations use generated types from `src/lib/supabase/database.types.ts`, ensuring type safety across the application.
Joined queries include related data in the response types.
