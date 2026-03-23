import { NextRequest, NextResponse } from "next/server";

import { deleteTimelineEntry } from "@/lib/supabase/services/timeline-server";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await deleteTimelineEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timeline entry:", error);
    return NextResponse.json({ error: "Failed to delete timeline entry" }, { status: 500 });
  }
}
