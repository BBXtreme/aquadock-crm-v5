import { NextRequest, NextResponse } from "next/server";

import { getAllTimelineForUser, createTimelineEntry } from "@/lib/supabase/services/timeline-server";

// GET /api/timeline?userId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const timeline = await getAllTimelineForUser(userId);
    return NextResponse.json(timeline);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}

// POST /api/timeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const timelineEntry = await createTimelineEntry(body);
    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating timeline entry:", error);
    return NextResponse.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}
