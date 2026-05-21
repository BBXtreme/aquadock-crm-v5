// src/app/api/companies/search/route.ts
// Route Handler that wraps the server-only `searchCompaniesList` helper.
// Called by `ClientCompaniesPage` via `fetch()` inside a `useSuspenseQuery`.
// Using a Route Handler (instead of a Server Action) avoids the Next.js 16
// restriction: "Server Functions cannot be called during initial render".
//
// Emits `Server-Timing` headers on every response (see server-timing.ts).
// is on (default-on locally, opt-in elsewhere). Speed Insights consumes these
// automatically; DevTools shows them in the Network → Timing panel.

import { NextResponse } from "next/server";

import {
  searchCompaniesList,
  searchCompaniesListInputSchema,
} from "@/lib/server/companies-search";
import { trackCompaniesSearchEvent } from "@/lib/server/perf-events";
import { createServerTiming, serverTimingHeaders } from "@/lib/server/server-timing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    const parsed = searchCompaniesListInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await searchCompaniesList(parsed.data, timing);
    totalStop();

    // Phase 2 §4.6 — cohort event for Speed Insights so we can split p95 by
    // strategy / cache hit / facet count without scraping logs.
    void trackCompaniesSearchEvent({
      strategy: result.globalSearchStrategy,
      activeFilters: parsed.data.activeFilters,
      waterFilter: parsed.data.waterFilter,
      resultCount: result.companies.length,
      timingSnapshot: timing.snapshot(),
    });

    const headers = serverTimingHeaders(timing);
    return NextResponse.json(result, headers ? { headers } : undefined);
  } catch (err: unknown) {
    totalStop();
    console.error("[API POST /companies/search] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const headers = serverTimingHeaders(timing);
    return NextResponse.json(
      { error: message },
      headers ? { status: 500, headers } : { status: 500 },
    );
  }
}
