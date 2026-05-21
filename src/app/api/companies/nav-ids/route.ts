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
import { logPhase1Perf } from "@/lib/companies/companies-hot-path";
import { fetchAllCompanyIdsForListNavigation } from "@/lib/companies/companies-list-supabase";
import { createServerTiming, serverTimingHeaders } from "@/lib/server/server-timing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseCompaniesListState } from "@/lib/utils/company-filters-url-state";

const bodySchema = z.object({
  searchParams: z.string(),
});

export async function POST(request: Request) {
  const timing = createServerTiming();
  const totalStop = timing.start("total");
  try {
    const authStop = timing.start("auth");
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authStop();
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
    // Phase 1: ranked-ids cache inside `buildCompaniesFilterApplier` is shared
    // with `/api/companies/search`, so a warm list view skips embedding + RPC.
    // Phase 2 §4.6 — also emits `Server-Timing` so Speed Insights aggregates
    // per-route p95 trends for the warm-cache nav case.
    const startedAt = Date.now();
    const navStop = timing.start("nav_ids");
    const ids = await fetchAllCompanyIdsForListNavigation(supabase, listState, timing);
    navStop();
    totalStop();
    logPhase1Perf("nav-ids.done", {
      idsCount: ids.length,
      durationMs: Date.now() - startedAt,
      globalFilterLength: listState.globalFilter.trim().length,
    });
    const headers = serverTimingHeaders(timing);
    return NextResponse.json({ ids }, headers ? { headers } : undefined);
  } catch (err: unknown) {
    totalStop();
    console.error("[API POST /companies/nav-ids] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const headers = serverTimingHeaders(timing);
    return NextResponse.json(
      { error: message },
      headers ? { status: 500, headers } : { status: 500 },
    );
  }
}
