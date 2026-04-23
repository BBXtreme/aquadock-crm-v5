import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthenticatedTimelineEntry } from "@/lib/server/timeline-insert";

const postTimelineBodySchema = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().max(2000).nullable().optional(),
    activity_type: z.string().optional(),
    company_id: z.string().uuid().nullable().optional(),
    contact_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("[POST /api/timeline] Body parse failed:", parseErr);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = postTimelineBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid timeline entry data", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const timelineEntry = await createAuthenticatedTimelineEntry({
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      activity_type: parsed.data.activity_type ?? "",
      company_id: parsed.data.company_id ?? null,
      contact_id: parsed.data.contact_id ?? null,
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
