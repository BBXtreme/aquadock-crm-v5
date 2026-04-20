// src/app/api/companies/nav-ids/route.ts
// Returns the ordered list of company ids matching the /companies list filters
// + sort (ignoring pagination). Powers prev/next navigation on the company
// detail page.
//
// Why a Route Handler instead of calling Supabase from the browser?
// `buildCompaniesFilterApplier` (invoked indirectly via
// `fetchAllCompanyIdsForListNavigation`) resolves semantic search and generates
// an embedding. Embedding calls require server-only env vars
// (AI_GATEWAY_API_KEY / OPENAI_API_KEY) that are never exposed to the browser,
// so running this path from a browser Supabase client always fell back to
// lexical search and silently produced wrong prev/next ordering.
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAllCompanyIdsForListNavigation } from "@/lib/companies/companies-list-supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseCompaniesListState } from "@/lib/utils/company-filters-url-state";

const bodySchema = z.object({
  searchParams: z.string(),
});

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
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const listState = parseCompaniesListState(new URLSearchParams(parsed.data.searchParams));
    const ids = await fetchAllCompanyIdsForListNavigation(supabase, listState);
    return NextResponse.json({ ids });
  } catch (err: unknown) {
    console.error("[API POST /companies/nav-ids] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
