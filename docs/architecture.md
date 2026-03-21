# AquaDock CRM v5 – Architecture Overview

**Last updated**: March 2026  
**Goal**: Clean separation of concerns, type safety, RLS respect, good DX, maintainable at scale

## 1. Core Principles

- **App Router** (Next.js 16+) with Server Components by default
- **Interactive parts** → `"use client"` only where necessary
- **Data fetching** → prefer Server Components / Server Actions
- **Type safety** → generated Supabase types + strict TS config
- **No global mutable state** (use zustand / react-query instead)
- **UI consistency** → shadcn/ui (radix-nova) + Tailwind v4.2.2 (config-less)
- **Auth & authorization** → Supabase Auth + Row Level Security (RLS)
- **Error handling** → centralized, user-friendly (sonner toasts)

## 2. Folder Structure (important folders only)
## 2. Folder Structure (important folders only)
src/
├── app/                        # App Router
│   ├── (auth)/                 # login, register, magic link, …
│   ├── (dashboard)/            # protected routes
│   │   ├── companies/          # list, detail, create, edit
│   │   ├── contacts/           # optional – or nested under companies
│   │   ├── reminders/
│   │   └── layout.tsx          # sidebar + topbar wrapper
│   ├── api/                    # Route Handlers (if needed – prefer Server Actions)
│   └── layout.tsx              # root layout (pure server)
│
├── components/
│   ├── ui/                     # shadcn primitives (Button, Card, Dialog, …)
│   ├── layout/                 # Sidebar, Header, PageHeader, Footer, …
│   ├── features/               # domain components
│   │   ├── CompanyCard.tsx
│   │   ├── TimelineItem.tsx
│   │   ├── ReminderBadge.tsx
│   │   └── MapMarkerPopup.tsx
│   └── ClientLayout.tsx        # single client wrapper (providers)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # browser client factory
│   │   ├── server.ts           # server client factory
│   │   ├── types.ts            # re-export of generated types
│   │   └── services/
│   │       ├── companies.ts
│   │       ├── contacts.ts
│   │       ├── reminders.ts
│   │       ├── timeline.ts
│   │       └── auth.ts
│   └── utils/
│       ├── cn.ts               # class-variance-authority helper
│       ├── format.ts           # currency, distance, date helpers
│       └── error.ts            # handleSupabaseError
│
├── hooks/
│   ├── useCompanyFilters.ts
│   ├── useDebounce.ts
│   └── useSupabase.ts          # (optional – react-query integration)
│
├── store/                      # zustand stores
│   └── companyFilters.ts
│
└── types/                      # global types (if not in supabase/types.ts)
text## 3. Data Flow Patterns

| Scenario                        | Preferred Approach                          | Why / Notes                                 |
|---------------------------------|---------------------------------------------|---------------------------------------------|
| Static / initial page data      | Server Component + server client            | RLS respected, no extra round-trips        |
| Optimistic UI + mutations       | Server Action + react-query + useMutation   | Best DX + type safety                       |
| Real-time (future)              | Supabase Realtime channel                   | Planned for v5.1+                           |
| Filters / search / pagination   | URL search params + Server Component        | Shareable links, SEO friendly               |
| Form submission                 | Server Action + react-hook-form + zod       | Progressive enhancement, type-safe          |

## 4. Authentication & Authorization

- Supabase Auth (email + magic link / OAuth planned)
- RLS on all tables: `auth.uid() = user_id` or company ownership
- Client-side → `useSession()` from `@supabase/auth-helpers-react`
- Server-side → `createServerClient()` + `getUser()`

Middleware pattern (optional):

```ts
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
export async function middleware(req) { … }
5. Styling & Theming

Tailwind v4.2.2 (no config file)
OKLCH color palette in globals.css
Dark mode via next-themes
Single ClientLayout wrapper provides:
ThemeProvider
TooltipProvider
Sonner Toaster


6. State Management

























PurposeToolScopeUI filters / table stateURL params + zustandlocal + shareableServer data cacheTanStack Querycomponents + mutationsGlobal app statezustand (minimal)theme, sidebar collapsed
7. Recommended Component Patterns
tsx// Good – Server Component fetching data
export default async function CompaniesPage() {
  const companies = await getCompaniesForUser();
  return <CompanyTable initialData={companies} />;
}

// Good – Client component with query
"use client"
import { useQuery } from "@tanstack/react-query";

export function CompanyDetail({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ["company", id],
    queryFn: () => getCompanyById(id),
  });
  // …
}

Next: concrete service layer examples (copy-paste ready)
text### Service Layer Examples

**`src/lib/supabase/services/companies.ts`**

```ts
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { handleSupabaseError } from "@/lib/utils/error";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export async function getCompaniesForUser(userId: string): Promise<Company[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("firmenname", { ascending: true });

  if (error) throw handleSupabaseError(error, "Failed to load companies");
  return data ?? [];
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*, contacts(*), reminders(*), timeline(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "Company not found");
  return data;
}

export async function createCompany(
  values: CompanyInsert & { user_id: string }
): Promise<Company> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("companies")
    .insert(values)
    .select()
    .single();

  if (error) throw handleSupabaseError(error, "Failed to create company");
  return data;
}

export async function updateCompany(
  id: string,
  values: CompanyUpdate
): Promise<Company> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("companies")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw handleSupabaseError(error, "Failed to update company");
  return data;
}
src/lib/supabase/server.ts (helper – keep minimal)
TypeScriptimport { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerClient() {
  const cookieStore = cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}
These patterns are:

fully typed (via generated types)
RLS-safe (server client respects policies)
centralized error handling
easy to extend with react-query integration

Would you like:

A matching useCompanies hook with react-query?
Example Server Action for company creation?
Folder structure diagram (text-based)?
Middleware + protected route example?