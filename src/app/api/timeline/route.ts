import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient, handleSupabaseError } from "@/lib/supabase/server";
import { getAllTimelineForUser, createTimelineEntry } from "@/lib/supabase/services/timeline-server";

// GET /api/timeline
// Returns timeline entries for current authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timeline = await getAllTimelineForUser(user.id);
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
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      user_id: user.id,
    });

    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating timeline entry:", error);
    return NextResponse.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}
