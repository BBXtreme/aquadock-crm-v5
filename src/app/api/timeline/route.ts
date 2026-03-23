import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient, handleSupabaseError } from "@/lib/supabase/server";
import { getAllTimelineForUser, createTimelineEntry } from "@/lib/supabase/services/timeline-server";

// GET /api/timeline
// Returns timeline entries for current authenticated user
export async function GET(request: NextRequest) {
  try {
    const timeline = await getAllTimelineForUser("dev-mock-user-11111111-2222-3333-4444-555555555555");
    return NextResponse.json(timeline);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}

// POST /api/timeline
// Create new timeline entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[POST /api/timeline] Raw received body:", JSON.stringify(body, null, 2));

    if (!body.title || !body.activity_type) {
      return NextResponse.json({ error: "Missing required fields: title and activity_type" }, { status: 400 });
    }

    const payload = {
      title: body.title,
      content: body.content ?? null,
      activity_type: body.activity_type,
      company_id: body.company_id ?? null,
      contact_id: body.contact_id ?? null,
      user_name: body.user_name ?? "Unknown",
      user_id: "fbd4cb43-1ff7-447b-bb56-d083bdc22bf7",  // Marco's real user ID
    };

    console.log("[POST /api/timeline] Prepared payload:", JSON.stringify(payload, null, 2));

    const timelineEntry = await createTimelineEntry(payload);

    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/timeline] CRASH DETAILS:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      code: error.code,
      details: error.details,
      hint: error.hint,
      bodyReceived: await request.json().catch(() => "could not re-read body")
    });

    return NextResponse.json(
      {
        error: "Failed to create timeline entry",
        details: error.message || "Unknown server error",
        code: error.code,
        hint: error.hint,
        status: 500
      },
      { status: 500 }
    );
  }
}
