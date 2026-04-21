// src/lib/validations/timeline.ts
// Zod schema for manual Timeline entries

import { z } from "zod";
import type { TimelineEntryInsert } from "@/types/database.types";

const manualActivityTypes = ["call", "email", "meeting", "other", "import"] as const;

export const timelineSchema = z.object({
  title: z.string().min(3, "Titel muss mindestens 3 Zeichen lang sein").max(200, "Titel darf maximal 200 Zeichen lang sein").trim(),
  activity_type: z.enum(manualActivityTypes, { required_error: "Aktivitätstyp ist erforderlich" }),
  content: z.string().max(2000, "Inhalt darf maximal 2000 Zeichen lang sein").nullable().optional(),
  company_id: z.string().uuid("Ungültige Unternehmens-ID").nullable().optional(),
  contact_id: z.string().uuid("Ungültige Kontakt-ID").nullable().optional(),
  user_name: z.string().optional(),
}).strict();

export type TimelineFormValues = z.infer<typeof timelineSchema>;

/** True when title/body look like a CSV or map (OpenMap / OSM) import note — used to badge and persist activity as Import. */
export function matchesImportActivityText(title: string, content?: string | null): boolean {
  const blob = `${title}\n${content ?? ""}`;
  const lower = blob.toLowerCase();
  const importWord = /import|importiert|uvoz|uvezeno/i.test(blob);
  if (!importWord) {
    return false;
  }
  const csvImport = /\bcsv\b/.test(lower) || /csv\s*import|import\s*(aus\s*)?csv/i.test(blob);
  const mapImport =
    /\bopenmap\b/i.test(blob) ||
    /open[\s-]?map/i.test(blob) ||
    /openstreet\s*map|openstreetmap/i.test(blob) ||
    /\bosm\b/i.test(lower);
  return csvImport || mapImport;
}

/** Maps legacy or invalid values (including removed `note`) to a valid manual activity type for inserts/updates. */
export function coerceActivityTypeForInsert(raw: string | null | undefined): (typeof manualActivityTypes)[number] {
  const v = (raw ?? "").trim();
  if (v === "call" || v === "email" || v === "meeting" || v === "other" || v === "import") {
    return v;
  }
  if (v === "csv_import") {
    return "import";
  }
  return "other";
}

/** Coerces activity type, then upgrades "other" to "import" when title/content describe a CSV or map import. */
export function resolveActivityTypeForTimelinePersist(
  rawType: string | null | undefined,
  title: string,
  content?: string | null,
): (typeof manualActivityTypes)[number] {
  const base = coerceActivityTypeForInsert(rawType);
  if (base === "other" && matchesImportActivityText(title, content ?? null)) {
    return "import";
  }
  return base;
}

/** Maps stored `csv_import` / `import` and import-like `other` rows to badge key `import`. */
export function normalizeTimelineBadgeActivityType(
  activityType: string,
  title: string | null | undefined,
  content: string | null | undefined,
): string {
  if (activityType === "csv_import" || activityType === "import") {
    return "import";
  }
  if (activityType === "other" && matchesImportActivityText(title ?? "", content)) {
    return "import";
  }
  return activityType;
}

export const toTimelineInsert = (values: TimelineFormValues): TimelineEntryInsert => ({
  ...values,
  content: values.content || null,
  company_id: values.company_id || null,
  contact_id: values.contact_id || null,
});

export type TimelineForm = z.infer<typeof timelineSchema>;
