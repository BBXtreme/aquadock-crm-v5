// src/lib/actions/timeline-forms.ts
// This file contains server-side functions for creating and updating timeline entries.
"use server";

import {
  type AuthenticatedTimelineCreateInput,
  createAuthenticatedTimelineEntry,
} from "@/lib/server/timeline-insert";
import type { TimelineEntry } from "@/types/database.types";

export type { AuthenticatedTimelineCreateInput };

export async function createTimelineEntryAction(
  input: AuthenticatedTimelineCreateInput,
): Promise<TimelineEntry> {
  return createAuthenticatedTimelineEntry(input);
}
