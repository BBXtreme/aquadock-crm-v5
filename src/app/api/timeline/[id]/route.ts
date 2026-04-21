import { type NextRequest, NextResponse } from "next/server";
import { deleteTimelineEntryWithTrash } from "@/lib/actions/crm-trash";
import { updateTimelineEntry } from "@/lib/services/timeline";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { coerceActivityTypeForInsert } from "@/lib/validations/timeline";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyWithUser = {
      ...body,
      updated_by: user.id,
      ...(typeof body.activity_type === "string"
        ? { activity_type: coerceActivityTypeForInsert(body.activity_type) }
        : {}),
    };
    const updatedEntry = await updateTimelineEntry(id, bodyWithUser, supabase);
    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error updating timeline entry:", error);
    return NextResponse.json({ error: "Failed to update timeline entry" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteTimelineEntryWithTrash(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timeline entry:", error);
    return NextResponse.json({ error: "Failed to delete timeline entry" }, { status: 500 });
  }
}
