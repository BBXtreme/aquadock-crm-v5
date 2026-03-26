import { type NextRequest, NextResponse } from "next/server";

import { createTimelineEntry, getAllTimelineForUser } from "@/lib/supabase/services/timeline-server";

// GET /api/timeline
// Returns timeline entries for current authenticated user
export async function GET(_request: NextRequest) {
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
  let body: unknown;
  try {
    try {
      body = await request.json();
      console.log("[POST /api/timeline] Raw received body:", JSON.stringify(body, null, 2));
    } catch (parseErr) {
      console.error("[POST /api/timeline] Body parse failed:", parseErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Explicit required fields check
    if (!body.title || !body.activity_type) {
      console.warn("[POST /api/timeline] Missing required fields:", {
        title: !!body.title,
        activity_type: !!body.activity_type,
      });
      return NextResponse.json({ error: "Title and activity_type are required" }, { status: 400 });
    }

    const payload = {
      title: body.title,
      content: body.content ?? null,
      activity_type: body.activity_type,
      company_id: body.company_id ?? null,
      contact_id: body.contact_id ?? null,
      user_name: body.user_name ?? "BangLee (fallback)",
      user_id: "fbd4cb43-1ff7-447b-bb56-d083bdc22bf7", // Marco's real user ID – must exist in auth.users
    };

    console.log("[POST /api/timeline] Final payload to service:", JSON.stringify(payload, null, 2));

    const timelineEntry = await createTimelineEntry(payload);

    console.log("[POST /api/timeline] Success – created entry:", timelineEntry.id);

    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error: unknown) {
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      code: error && typeof error === "object" && "code" in error ? (error as { code: unknown }).code : undefined,
      details:
        error && typeof error === "object" && "details" in error ? (error as { details: unknown }).details : undefined,
      hint: error && typeof error === "object" && "hint" in error ? (error as { hint: unknown }).hint : undefined,
      cause: error && typeof error === "object" && "cause" in error ? (error as { cause: unknown }).cause : undefined,
      bodyReceived: body || "not parsed",
    };

    console.error("[POST /api/timeline] FULL CRASH:", JSON.stringify(errorDetails, null, 2));

    return NextResponse.json(
      {
        error: "Failed to create timeline entry",
        details: errorDetails.message,
        code: errorDetails.code,
        hint: errorDetails.hint,
      },
      { status: 500 },
    );
  }
}
