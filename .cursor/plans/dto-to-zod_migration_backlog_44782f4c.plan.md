---
name: DTO-to-Zod migration backlog
overview: Inventory current DTO usage, align all forms and server actions to strict Zod schemas derived from the generated Supabase types, and remove redundant DTOs in favor of schema-driven form value types + Insert/Update mappers. Also reconcile enum-like fields (status, priority, etc.) to the canonical UI option sets you selected and document RLS expectations from existing SQL policy files.
todos:
  - id: inventory-dto-usage
    content: Lock down DTO inventory + import graph for `src/lib/dto/*` and document all usage sites (already identified; keep in plan as baseline).
    status: pending
  - id: zod-company-canonical
    content: Update shared company Zod schema to `.strict()`, enforce `statusOptions/kundentypOptions/wassertypOptions`, normalize empty strings → null, and add `toCompanyUpdate`.
    status: pending
  - id: zod-contact-canonical
    content: Update shared contact Zod schema to `.strict()`, add `.email()`, add `.uuid()` for `company_id`, normalize empty strings → null, and refine `anrede` against options.
    status: pending
  - id: zod-reminder-canonical
    content: Rewrite reminder schema to match UI values (priority/status), use `z.coerce.date()` + ISO mapper, and enforce `company_id` as UUID.
    status: pending
  - id: zod-timeline-canonical
    content: "Tighten timeline schema: strict, activity_type enum, uuid ids with \"none\" normalization, content length limits."
    status: pending
  - id: zod-email-template
    content: Add new email template schema + integrate into `EmailTemplatesClient` before create/update operations.
    status: pending
  - id: refactor-forms-off-dtos
    content: Refactor CompanyEditForm + contact pages + reminder forms + timeline form to import shared schemas and use `z.infer` types instead of DTO types; remove local duplicate schemas.
    status: pending
  - id: rls-alignment-review
    content: Review actions/services that write rows to ensure `user_id` is set server-side or left to DB default; document which client-side paths will break under RLS and queue migration to server-only mutations.
    status: pending
  - id: delete-or-deprecate-dto-files
    content: After all imports removed, delete `src/lib/dto/company.dto.ts` and `src/lib/dto/contact.dto.ts` (or keep as deprecated re-exports) to prevent drift.
    status: pending
  - id: migration-backlog
    content: Produce numbered migration backlog with exact file paths + effort estimates and order of operations (schemas first, then forms, then services/actions).
    status: pending
isProject: false
---

# DTO → Zod → Supabase alignment plan

## What exists today (scanned)
- **DTOs in use** (only 2):
  - `[src/lib/dto/company.dto.ts](src/lib/dto/company.dto.ts)` exports `CompanyFormDTO`
  - `[src/lib/dto/contact.dto.ts](src/lib/dto/contact.dto.ts)` exports `ContactFormDTO`
- **Import/usage sites**:
  - `[src/components/features/companies/CompanyEditForm.tsx](src/components/features/companies/CompanyEditForm.tsx)` imports `CompanyFormDTO` and defines a *local* `companySchema`.
  - `[src/components/features/contacts/ContactCreateForm.tsx](src/components/features/contacts/ContactCreateForm.tsx)` imports `ContactFormDTO`, uses shared `contactSchema`.
  - `[src/components/features/contacts/ContactEditForm.tsx](src/components/features/contacts/ContactEditForm.tsx)` imports `ContactFormDTO`, uses shared `contactSchema`.
  - `[src/app/(protected)/contacts/[id]/ContactDetailClient.tsx](src/app/(protected)/contacts/[id]/ContactDetailClient.tsx)` imports `ContactFormDTO` and defines a second *local* `contactSchema`.
- **Existing shared Zod schemas**:
  - `[src/lib/validations/company.ts](src/lib/validations/company.ts)` (good trimming/max; not `.strict()`; email not `.email()`)
  - `[src/lib/validations/contact.ts](src/lib/validations/contact.ts)` (same; email not `.email()`; ids not `.uuid()`)
  - `[src/lib/validations/reminder.ts](src/lib/validations/reminder.ts)` (does not match current UI option values)
  - `[src/lib/validations/timeline.ts](src/lib/validations/timeline.ts)` (very permissive; ids not `.uuid()`; activity_type not enum)
- **Generated DB shapes** (source of truth for nullability): `[src/types/supabase.ts](src/types/supabase.ts)`
  - `companies.status`, `companies.kundentyp`, `companies.wassertyp` are all **`string`** in generated types (no DB enum).
  - `reminders.priority`, `reminders.status` are **`string | null`**.
  - Most `*_id` columns are `string` (UUID in DB, but TS type is `string`).
- **RLS**: present as SQL scripts (not migrations) in:
  - `[src/sql/rls-setup.sql](src/sql/rls-setup.sql)` and `[src/sql/role-based-rls.sql](src/sql/role-based-rls.sql)`
  - Policies gate access via `auth.uid() = user_id` for `companies`, `contacts`, `reminders`, `timeline`.

## Canonical “enum-like” values (per your choices)
- **`companies.status`**: enforce **UI options** from `[src/lib/constants/company-options.ts](src/lib/constants/company-options.ts)` `statusOptions` (includes `kunde`, `partner`, `inaktiv` in addition to the sales funnel statuses).
- **reminders `priority` + `status`**: enforce **UI options** from `[src/lib/constants/company-options.ts](src/lib/constants/company-options.ts)` (`hoch|normal|niedrig` and `open|closed`).

## Recommended Zod schemas (exact behaviors)
All schemas should:
- Use `.strict()` to reject unexpected fields.
- Use `.trim()` on all user-entered strings.
- Use `.max(N)` consistent with existing validation limits (keep current limits unless DB constraints exist).
- Normalize “empty string” inputs to `null` for nullable DB columns via `z.preprocess` or `.transform`.

### Company
- Define `companyFormSchema` in `[src/lib/validations/company.ts](src/lib/validations/company.ts)` (either rename `companySchema` or export both):
  - `firmenname`: `z.string().trim().min(1).max(200)`
  - `kundentyp`: `z.enum(kundentypOptions values)` (or `z.string().trim().min(1).max(50)` + refine against list)
  - `status`: `z.enum(statusOptions values)`
  - `email`: `z.string().trim().email("Ungültige E-Mail-Adresse").max(320).nullable().optional()` with empty-string → `null`
  - `website`: `z.string().trim().url("Ungültige URL").max(500).nullable().optional()` with empty-string → `null`
  - `plz`: keep current `.max(10)`; optional refinement to `^\d{5}$` can be added *only if you want Germany-only*
  - `lat/lon`: `z.number().min(-90).max(90)` and `z.number().min(-180).max(180)` (nullable/optional)
  - `wassertyp`: should be refined against `wassertypOptions` from constants (currently string)
- Keep conversion helpers `toCompanyInsert` / add `toCompanyUpdate` so server actions/forms don’t hand-roll mapping.

### Contact
- Update `[src/lib/validations/contact.ts](src/lib/validations/contact.ts)` to:
  - `.strict()`
  - `email`: `.trim().email(...).max(320)` nullable optional with empty-string → `null`
  - `company_id`: `z.string().uuid().nullable().optional()` (empty-string → `null`)
  - `anrede`: refine against `anredeOptions` values

### Reminder
- Replace current mismatch by defining `reminderFormSchema` in `[src/lib/validations/reminder.ts](src/lib/validations/reminder.ts)`:
  - `title`: `.trim().min(3).max(200)`
  - `company_id`: `z.string().uuid()`
  - `due_date`: prefer `z.coerce.date()` in the schema; add helper to convert to ISO string for `ReminderInsert`
  - `priority`: `z.enum(["hoch","normal","niedrig"]).nullable().optional()` (and/or default)
  - `status`: `z.enum(["open","closed"]).nullable().optional()`
  - `assigned_to`: `.trim().max(100).nullable().optional()`
  - `description`: `.trim().max(2000).nullable().optional()`

### Timeline
- Centralize to `[src/lib/validations/timeline.ts](src/lib/validations/timeline.ts)` and enforce:
  - `activity_type`: `z.enum(["note","call","email","meeting","reminder","other"])`
  - `company_id` / `contact_id`: `z.string().uuid().nullable().optional()` with `"none"` handled via `z.preprocess`
  - `content`: `.trim().max(2000).nullable().optional()`

### Email templates
- Add new `[src/lib/validations/email-template.ts](src/lib/validations/email-template.ts)`:
  - `name`: `.trim().min(1).max(200)`
  - `subject`: `.trim().min(1).max(500)`
  - `body`: `.trim().min(1).max(20000)` (large but bounded)

## Files that should be updated (high-confidence)
- **Remove or stop using DTOs** (replace with schema-inferred types):
  - `[src/lib/dto/company.dto.ts](src/lib/dto/company.dto.ts)`
  - `[src/lib/dto/contact.dto.ts](src/lib/dto/contact.dto.ts)`
- **Company form** should use shared schema instead of a local one:
  - `[src/components/features/companies/CompanyEditForm.tsx](src/components/features/companies/CompanyEditForm.tsx)`
- **Contact detail** should use shared schema instead of a local one:
  - `[src/app/(protected)/contacts/[id]/ContactDetailClient.tsx](src/app/(protected)/contacts/[id]/ContactDetailClient.tsx)`
- **Reminder forms** should use shared schema (currently both define local schemas):
  - `[src/components/features/reminder/ReminderCreateForm.tsx](src/components/features/reminder/ReminderCreateForm.tsx)`
  - `[src/components/features/reminder/ReminderEditForm.tsx](src/components/features/reminder/ReminderEditForm.tsx)`
- **Timeline form** should use shared schema:
  - `[src/components/features/timeline/TimelineEntryForm.tsx](src/components/features/timeline/TimelineEntryForm.tsx)`
- **Email templates UI** should validate via Zod before calling service methods:
  - `[src/components/tables/EmailTemplatesClient.tsx](src/components/tables/EmailTemplatesClient.tsx)`

## RLS implications to bake into schemas/actions
From `[src/sql/rls-setup.sql](src/sql/rls-setup.sql)`:
- Writes require `auth.uid() IS NOT NULL`.
- Reads/updates/deletes require `auth.uid() = user_id`.
Practical implication:
- Insert mappers should **not accept user_id from the client**; server should set it (or rely on DB default).
- Any client-side direct writes will fail once RLS is enforced unless the session is present and `user_id` aligns.

## Cursor skills to add (recommended)
- **Zod + Supabase “nullable/empty-string normalization”**: patterns for `.nullable().optional()` plus consistent preprocessing and typed Insert/Update mapping.
- **React Hook Form v7 + Zod (shadcn/ui)**: standardized field components, default values, `zodResolver`, and “hook-first” patterns.
- **Supabase RLS debugging playbook**: common RLS failure modes, how to surface policy-denied errors, and how to ensure inserts set `user_id`.
