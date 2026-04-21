import { type NextRequest, NextResponse } from "next/server";
import { createAuthenticatedTimelineEntry } from "@/lib/server/timeline-insert";

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
    } catch (parseErr) {
      console.error("[POST /api/timeline] Body parse failed:", parseErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isValidTimelineEntry(body)) {
      return NextResponse.json({ error: "Invalid timeline entry data" }, { status: 400 });
    }

    const timelineEntry = await createAuthenticatedTimelineEntry({
      title: body.title,
      content: typeof body.content === "string" ? body.content : null,
      activity_type: typeof body.activity_type === "string" ? body.activity_type : "",
      company_id: typeof body.company_id === "string" ? body.company_id : null,
      contact_id: typeof body.contact_id === "string" ? body.contact_id : null,
    });
    return NextResponse.json(timelineEntry, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/timeline] Error:", error);
    return NextResponse.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}
