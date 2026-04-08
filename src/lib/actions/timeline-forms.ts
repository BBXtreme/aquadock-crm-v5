// src/lib/actions/timeline-forms.ts
// This file contains server-side functions for creating and updating timeline entries.
"use server";

import { createAuthenticatedTimelineEntry } from "@/lib/server/timeline-insert";
import type { TimelineEntry } from "@/types/database.types";

/** Local shape only — Next.js server-action compilation can leave stray references to imported type aliases at runtime (`ReferenceError`). */
type CreateTimelineEntryActionInput = {
  title: string;
  content?: string | null;
  activity_type?: string;
  company_id?: string | null;
  contact_id?: string | null;
};

export async function createTimelineEntryAction(
  input: CreateTimelineEntryActionInput,
): Promise<TimelineEntry> {
  return createAuthenticatedTimelineEntry(input);
}
