import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient, handleSupabaseError } from "@/lib/supabase/server";
import { deleteTimelineEntry, updateTimelineEntry } from "@/lib/supabase/services/timeline-server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const body = await request.json();
    const updatedEntry = await updateTimelineEntry(id, body);
    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error updating timeline entry:", error);
    return NextResponse.json({ error: "Failed to update timeline entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;  // <-- must await here

    console.log("Deleting timeline entry with id:", id);  // debug

    await deleteTimelineEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timeline entry:", error);
    return NextResponse.json({ error: "Failed to delete timeline entry" }, { status: 500 });
  }
}
