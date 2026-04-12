import type { SupabaseClient } from "@supabase/supabase-js";

import {
  COMPANY_IMPORT_SOURCE_HEADER,
  COMPANY_IMPORT_SOURCE_OSM_POI,
} from "@/lib/constants/company-import-source";
import { getMessagesForLocale, resolveAppLocale } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/types";
import { createTimelineEntry } from "@/lib/services/timeline";

function normalizeHeaderValue(raw: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

export function isOsmPoiCompanyImport(request: Request): boolean {
  const value = request.headers.get(COMPANY_IMPORT_SOURCE_HEADER);
  return normalizeHeaderValue(value) === COMPANY_IMPORT_SOURCE_OSM_POI;
}

/** Best-effort locale for stored timeline copy (defaults to German). */
export function resolveLocaleFromRequest(request: Request): AppLocale {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/i.exec(cookieHeader);
  if (cookieMatch?.[1]) {
    const decoded = decodeURIComponent(cookieMatch[1].trim());
    return resolveAppLocale(decoded);
  }
  const accept = request.headers.get("accept-language");
  if (accept) {
    const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
    if (first.startsWith("hr")) {
      return "hr";
    }
    if (first.startsWith("en")) {
      return "en";
    }
  }
  return "de";
}

/** `companies.osm` is stored as `type/id`; build a browse URL when possible. */
export function buildOsmBrowseUrl(osm: string | null): string | null {
  if (!osm || osm.trim() === "") {
    return null;
  }
  const trimmed = osm.trim();
  if (trimmed.startsWith("https://www.openstreetmap.org/")) {
    return trimmed;
  }
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const type = parts[0];
    const id = parts[parts.length - 1];
    if (type && id) {
      return `https://www.openstreetmap.org/${type}/${id}`;
    }
  }
  return null;
}

function interpolateContent(template: string, osmUrl: string | null): string {
  const url = osmUrl ?? "—";
  return template.replaceAll("{osmUrl}", url);
}

export async function createOsmImportTimelineForCompany(input: {
  supabase: SupabaseClient;
  userId: string;
  companyId: string;
  companyOsm: string | null;
  request: Request;
}): Promise<void> {
  const locale = resolveLocaleFromRequest(input.request);
  const messages = getMessagesForLocale(locale);
  const title = messages.openmap.osmImportTimelineTitle;
  const template = messages.openmap.osmImportTimelineContent;
  const osmUrl = buildOsmBrowseUrl(input.companyOsm);
  const content = interpolateContent(template, osmUrl);

  await createTimelineEntry(
    {
      title,
      content,
      activity_type: "other",
      company_id: input.companyId,
      contact_id: null,
      user_id: input.userId,
      created_by: input.userId,
      updated_by: input.userId,
    },
    input.supabase,
  );
}
