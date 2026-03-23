import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient, handleSupabaseError } from "@/lib/supabase/server";
import { getAllTimelineForUser, createTimelineEntry } from "@/lib/supabase/services/timeline-server";

// GET /api/timeline
// Returns timeline entries for current authenticated user
export async function GET(request: NextRequest) {
  try {
    const timeline = await getAllTimelineForUser("dummy");
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
    const { title, content, activity_type, company_id, user_name } = body;

    if (!title || !activity_type) {
      return NextResponse.json({ error: "Title and activity_type are required" }, { status: 400 });
    }

    const timelineEntry = await createTimelineEntry({
      title,
      content,
      activity_type,
      company_id,
      user_name,
    });

    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating timeline entry:", error);
    return NextResponse.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}
