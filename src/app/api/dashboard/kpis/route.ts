// src/app/api/dashboard/kpis/route.ts
// Lightweight Route Handler that wraps `loadDashboardKpis` for client-side
// period switching. Called by `DashboardClient` via `fetch()` inside React Query
// when the user changes the 7d / 30d / 90d selector.
// Initial render is hydrated from the RSC (`/dashboard/page.tsx`), so this route
// only fires on user interaction — no extra round-trip on first paint.

import { NextResponse } from "next/server";

import { isDashboardKpiPeriod, loadDashboardKpis } from "@/lib/services/dashboard-kpis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError !== null || user === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");
    const period = isDashboardKpiPeriod(periodParam) ? periodParam : "30d";

    const kpis = await loadDashboardKpis(supabase, period);
    return NextResponse.json(kpis);
  } catch (err: unknown) {
    console.error("[API GET /dashboard/kpis] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
