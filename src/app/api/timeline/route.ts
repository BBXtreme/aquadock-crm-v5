// src/app/api/timeline/route.ts
// This file defines the API route handlers for the /api/timeline endpoint, which allows fetching and creating timeline entries for users.
// The GET handler retrieves all timeline entries for a specific user (currently hardcoded for development purposes), while the POST handler creates a new timeline entry based on the request body.
// The POST handler includes robust error handling and validation to ensure that the incoming data is in the expected format and to provide detailed logging in case of errors.
// The timeline entries are managed through Supabase services, and the handlers interact with these services to perform database operations.

import { type NextRequest, NextResponse } from "next/server";

import { createTimelineEntry, getAllTimelineForUser } from "@/lib/actions/timeline";

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
  let body: unknown = null;
  try {
    try {
      body = await request.json();
      console.log("[POST /api/timeline] Raw received body:", JSON.stringify(body, null, 2));
    } catch (parseErr) {
      console.error("[POST /api/timeline] Body parse failed:", parseErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Type guard for body
    const isBodyObject = (obj: unknown): obj is Record<string, unknown> => {
      return typeof obj === "object" && obj !== null;
    };

    if (!isBodyObject(body)) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }

    // Explicit required fields check with type validation
    if (typeof body.title !== "string" || typeof body.activity_type !== "string") {
      console.warn("[POST /api/timeline] Invalid or missing required fields:", {
        title: typeof body.title,
        activity_type: typeof body.activity_type,
      });
      return NextResponse.json({ error: "title and activity_type must be strings" }, { status: 400 });
    }

    const payload = {
      title: body.title,
      content: typeof body.content === "string" ? body.content : null,
      activity_type: body.activity_type,
      company_id: typeof body.company_id === "string" ? body.company_id : null,
      contact_id: typeof body.contact_id === "string" ? body.contact_id : null,
      user_name: typeof body.user_name === "string" ? body.user_name : "BangLee (fallback)",
      user_id: "fbd4cb43-1ff7-447b-bb56-d083bdc22bf7", // Marco's real user ID – must exist in auth.users
    };

    console.log("[POST /api/timeline] Final payload to service:", JSON.stringify(payload, null, 2));

    const timelineEntry = await createTimelineEntry(payload);

    console.log("[POST /api/timeline] Success – created entry:", timelineEntry.id);

    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error: unknown) {
    function hasCode(obj: unknown): obj is { code: unknown } {
      return typeof obj === "object" && obj !== null && "code" in obj;
    }

    function hasDetails(obj: unknown): obj is { details: unknown } {
      return typeof obj === "object" && obj !== null && "details" in obj;
    }

    function hasHint(obj: unknown): obj is { hint: unknown } {
      return typeof obj === "object" && obj !== null && "hint" in obj;
    }

    function hasCause(obj: unknown): obj is { cause: unknown } {
      return typeof obj === "object" && obj !== null && "cause" in obj;
    }

    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      code: hasCode(error) ? error.code : undefined,
      details: hasDetails(error) ? error.details : undefined,
      hint: hasHint(error) ? error.hint : undefined,
      cause: hasCause(error) ? error.cause : undefined,
      bodyReceived: body !== null ? body : "not parsed",
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
