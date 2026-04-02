// src/app/api/timeline/route.ts
// This file defines the API route handlers for the /api/timeline endpoint, which allows fetching and creating timeline entries for users.
// The GET handler retrieves all timeline entries for a specific user (currently hardcoded for development purposes), while the POST handler creates a new timeline entry based on the request body.
// The POST handler includes robust error handling and validation to ensure that the incoming data is in the expected format and to provide detailed logging in case of errors.
// The timeline entries are managed through Supabase services, and the handlers interact with these services to perform database operations.

import { type NextRequest, NextResponse } from "next/server";

import { deleteTimelineEntry, updateTimelineEntry } from "@/lib/actions/timeline";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("PUT id:", id);
    const body = await request.json();
    console.log("PUT body received:", body);
    const updatedEntry = await updateTimelineEntry(id, body);
    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error updating timeline entry:", error);
    return NextResponse.json({ error: "Failed to update timeline entry" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // <-- must await here

    console.log("Deleting timeline entry with id:", id); // debug

    await deleteTimelineEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timeline entry:", error);
    return NextResponse.json({ error: "Failed to delete timeline entry" }, { status: 500 });
  }
}
