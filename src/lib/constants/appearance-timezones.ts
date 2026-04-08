import { isValidIanaTimeZone } from "@/lib/validations/appearance";

/** Curated fallback when `Intl.supportedValuesOf("timeZone")` is unavailable. */
const APPEARANCE_TIMEZONE_FALLBACK_IDS: readonly string[] = [
  "UTC",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Europe/Vienna",
  "Europe/Zurich",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Helsinki",
  "Europe/Athens",
  "Europe/Dublin",
  "Europe/Lisbon",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Asia/Jerusalem",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "Pacific/Honolulu",
  "Atlantic/Reykjavik",
  "Indian/Maldives",
  "Antarctica/McMurdo",
  "Arctic/Longyearbyen",
];

export type AppearanceTimeZoneRegionId =
  | "europe"
  | "americas"
  | "africa"
  | "asia"
  | "australia"
  | "pacific"
  | "atlantic"
  | "indian"
  | "antarctica"
  | "arctic"
  | "other";

const REGION_ORDER: readonly AppearanceTimeZoneRegionId[] = [
  "europe",
  "americas",
  "africa",
  "asia",
  "australia",
  "pacific",
  "atlantic",
  "indian",
  "antarctica",
  "arctic",
  "other",
];

export function regionIdFromIana(iana: string): AppearanceTimeZoneRegionId {
  if (iana.startsWith("Europe/")) return "europe";
  if (iana.startsWith("America/")) return "americas";
  if (iana.startsWith("Africa/")) return "africa";
  if (iana.startsWith("Asia/")) return "asia";
  if (iana.startsWith("Australia/")) return "australia";
  if (iana.startsWith("Pacific/")) return "pacific";
  if (iana.startsWith("Atlantic/")) return "atlantic";
  if (iana.startsWith("Indian/")) return "indian";
  if (iana.startsWith("Antarctica/")) return "antarctica";
  if (iana.startsWith("Arctic/")) return "arctic";
  return "other";
}

function getAllAppearanceTimeZoneIds(): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      // Do not call isValidIanaTimeZone per id — that is ~400+ DateTimeFormat constructions and freezes the main thread.
      // `Intl.supportedValuesOf("timeZone")` returns implementation-defined valid IANA names.
      return [...Intl.supportedValuesOf("timeZone")];
    } catch {
      // fall through
    }
  }
  return APPEARANCE_TIMEZONE_FALLBACK_IDS.filter((id) => isValidIanaTimeZone(id));
}

/**
 * City-style label plus UTC offset, for menus. `localeTag` e.g. de-DE / en-US / hr-HR.
 */
export function formatTimeZoneMenuLabel(iana: string, localeTag: string): string {
  const tail = iana.split("/").pop();
  const city = tail ? tail.replaceAll("_", " ") : iana;
  let offset = "";
  try {
    const parts = new Intl.DateTimeFormat(localeTag, {
      timeZone: iana,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    offset = "";
  }
  if (offset) {
    return `${city} (${offset})`;
  }
  return city;
}

export type AppearanceTimeZoneGroup = {
  regionId: AppearanceTimeZoneRegionId;
  zones: readonly { id: string; label: string }[];
};

/**
 * All supported IANA zones grouped by region, zones sorted by display label.
 */
export function getAppearanceTimeZoneGroups(localeTag: string): AppearanceTimeZoneGroup[] {
  const ids = getAllAppearanceTimeZoneIds();
  const byRegion = new Map<AppearanceTimeZoneRegionId, { id: string; label: string }[]>();
  for (const id of REGION_ORDER) {
    byRegion.set(id, []);
  }
  for (const zoneId of ids) {
    const region = regionIdFromIana(zoneId);
    const list = byRegion.get(region);
    if (list) {
      list.push({ id: zoneId, label: formatTimeZoneMenuLabel(zoneId, localeTag) });
    }
  }
  const result: AppearanceTimeZoneGroup[] = [];
  for (const regionId of REGION_ORDER) {
    const zones = byRegion.get(regionId);
    if (zones === undefined || zones.length === 0) continue;
    const sorted = [...zones].sort((a, b) =>
      a.label.localeCompare(b.label, localeTag, { sensitivity: "base" }),
    );
    result.push({ regionId, zones: sorted });
  }
  return result;
}
