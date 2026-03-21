# AquaDock CRM – Supabase Schema v5

**Version**: 5.0 (March 2026)  
**Last audited**: 2026-03-21  
**Environment**: Supabase PostgreSQL 15+  
**RLS**: Enabled on all business tables  
**Types**: `src/lib/supabase/database.types.ts` (auto-generated)  
**Service layer**: `src/lib/supabase/services/*.ts`

## 1. Overview

| Table           | Purpose                   | ~Rows | PK   | Main Relations            | RLS  | Key Indexes                  |
| --------------- | ------------------------- | ----- | ---- | ------------------------- | ---- | ---------------------------- |
| companies       | Core business entities    | 450   | uuid | —                         | Yes  | status, user_id, kundentyp   |
| contacts        | Persons / decision makers | 1 200 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| reminders       | Tasks & follow-ups        | 320   | uuid | → companies.id (required) | Yes  | company_id, due_date, status |
| timeline        | Activity log              | 2 800 | uuid | → companies.id (nullable) | Yes  | company_id, user_id          |
| email_log       | Outgoing email tracking   | 1 900 | uuid | —                         | Yes  | —                            |
| email_templates | Reusable email templates  | 18    | uuid | —                         | Yes  | name (unique)                |

## 2. Core Tables – Column Overview

### companies

| Column     | Type        | Nullable | Default           | Business Meaning                          | Notes / Index |
| ---------- | ----------- | -------- | ----------------- | ----------------------------------------- | ------------- |
| id         | uuid        | false    | gen_random_uuid() | Primary key                               | PK            |
| firmenname | text        | false    | —                 | Legal name                                | —             |
| kundentyp  | text        | false    | 'sonstige'        | restaurant, hotel, marina, camping, …     | Indexed       |
| status     | text        | false    | 'lead'            | lead, qualifiziert, gewonnen, verloren, … | Indexed       |
| value      | bigint      | true     | 0                 | Estimated deal value (€)                  | —             |
| lat / lon  | real        | true     | —                 | Geographic coordinates                    | —             |
| osm        | text        | true     | —                 | OSM node/way/relation ID                  | —             |
| user_id    | uuid        | true     | —                 | Owner (auth.uid())                        | Indexed       |
| created_at | timestamptz | true     | now()             | —                                         | —             |
| updated_at | timestamptz | true     | now()             | —                                         | —             |

*(contacts, reminders, timeline follow similar pattern – full columns in generated types)*

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
Admin & service_role bypass for maintenance & migrations.
5. Performance Indexes (active)

companies: status, kundentyp, user_id
contacts: company_id, user_id, (company_id + is_primary)
reminders: company_id, due_date, status, user_id
timeline: company_id, user_id

```



## 6. Maintenance & Type Safety

Regenerate types after schema change
Bash# Local Supabase
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts

# Remote project (recommended for CI)
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/database.types.ts
Service layer pattern (example):
TypeScript// src/lib/supabase/services/companies.ts
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export async function getCompanies(userId: string): Promise<Company[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("firmenname");

  if (error) throw handleSupabaseError(error);
  return data ?? [];
}
## 7. Change Log

2026-03-20 Initial v5 snapshot
2026-03-21 Refined documentation, added index overview