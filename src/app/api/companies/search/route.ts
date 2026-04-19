// src/app/api/companies/search/route.ts
// Route Handler that wraps the server-only `searchCompaniesList` helper.
// Called by `ClientCompaniesPage` via `fetch()` inside a `useSuspenseQuery`.
// Using a Route Handler (instead of a Server Action) avoids the Next.js 16
// restriction: "Server Functions cannot be called during initial render".

import { NextResponse } from "next/server";
import {
  searchCompaniesList,
  searchCompaniesListInputSchema,
} from "@/lib/server/companies-search";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = searchCompaniesListInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await searchCompaniesList(parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[API POST /companies/search] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
