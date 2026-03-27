import { type NextRequest, NextResponse } from "next/server";

import { deleteTimelineEntry, updateTimelineEntry } from "@/lib/supabase/services/timeline-server";

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
