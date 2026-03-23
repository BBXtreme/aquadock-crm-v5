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
    const payload = {
      ...body,
      user_id: "dev-mock-user-11111111-2222-3333-4444-555555555555",
      user_name: body.user_name || "Dev User"
    };
    const timelineEntry = await createTimelineEntry(payload);

    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating timeline entry:", error);
    return NextResponse.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}
