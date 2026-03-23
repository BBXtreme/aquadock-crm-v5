import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient, handleSupabaseError } from "@/lib/supabase/server";
import { deleteTimelineEntry } from "@/lib/supabase/services/timeline-server";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Check if the entry belongs to the user
    const { data: entry, error: fetchError } = await supabase
      .from("timeline")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw handleSupabaseError(fetchError, "fetchTimelineEntry");
    }

    if (!entry || entry.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteTimelineEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timeline entry:", error);
    return NextResponse.json({ error: "Failed to delete timeline entry" }, { status: 500 });
  }
}
