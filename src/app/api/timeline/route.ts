import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTimelineEntry } from "@/lib/supabase/services/timeline";

function isValidTimelineEntry(body: unknown): body is {
  title: string;
  content?: string;
  activity_type?: string;
  company_id?: string | null;
  contact_id?: string | null;
} {
  return typeof body === "object" && body !== null && "title" in body && typeof (body as Record<string, unknown>).title === "string";
}

export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    try {
      body = await request.json();
      console.log("[POST /api/timeline] Raw received body:", JSON.stringify(body, null, 2));
    } catch (parseErr) {
      console.error("[POST /api/timeline] Body parse failed:", parseErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isValidTimelineEntry(body)) {
      return NextResponse.json({ error: "Invalid timeline entry data" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = {
      title: body.title,
      content: typeof body.content === "string" ? body.content : null,
      activity_type: body.activity_type || "note",
      company_id: typeof body.company_id === "string" ? body.company_id : null,
      contact_id: typeof body.contact_id === "string" ? body.contact_id : null,
    };

    const bodyWithUser = { ...payload, user_id: user.id, created_by: user.id, updated_by: user.id };
    const timelineEntry = await createTimelineEntry(bodyWithUser, supabase);
    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/timeline] Error:", error);
    return NextResponse.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}
