/**
 * Internal worker: poll xAI Batch status and update `ai_batch_jobs`.
 * Protect with CRON_SECRET or AI_BATCH_WORKER_SECRET (Authorization: Bearer …).
 * Requires SUPABASE_SERVICE_ROLE_KEY on the server and optional XAI_API_KEY for upstream calls.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? process.env.AI_BATCH_WORKER_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === secret;
}

export async function POST(request: Request): Promise<Response> {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceKey || !url) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const xaiKey = process.env.XAI_API_KEY?.trim();
  if (!xaiKey) {
    return NextResponse.json({
      ok: true,
      message: "no_xai_key",
      polled: 0,
    });
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: jobs, error } = await admin
    .from("ai_batch_jobs")
    .select("id, external_batch_id, status")
    .in("status", ["submitted", "processing"])
    .not("external_batch_id", "is", null)
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let polled = 0;
  for (const job of jobs ?? []) {
    const batchId = job.external_batch_id;
    if (!batchId) {
      continue;
    }
    const res = await fetch(`https://api.x.ai/v1/batches/${batchId}`, {
      headers: { Authorization: `Bearer ${xaiKey}` },
    });
    if (!res.ok) {
      continue;
    }
    const body = (await res.json()) as { state?: { num_pending?: number } };
    polled += 1;
    const pending = body.state?.num_pending;
    await admin
      .from("ai_batch_jobs")
      .update({
        status: "processing",
        progress: body.state as Database["public"]["Tables"]["ai_batch_jobs"]["Row"]["progress"],
      })
      .eq("id", job.id);
    if (pending === 0) {
      await admin
        .from("ai_batch_jobs")
        .update({ status: "completed", result_summary: { note: "polled_complete" } })
        .eq("id", job.id);
    }
  }

  return NextResponse.json({ ok: true, polled, jobs: (jobs ?? []).length });
}
