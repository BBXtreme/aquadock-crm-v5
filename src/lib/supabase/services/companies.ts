import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

import type { Company, CompanyInsert } from "../database.types";
import { handleSupabaseError } from "../utils";

/* ============================================= */
/*  OSM TAG MAPPINGS (erweitert März 2026)      */
/* ============================================= */
const KUNDENTYP_MAP: Record<string, string> = {
  // amenity
  restaurant: "restaurant",
  cafe: "restaurant",
  bar: "restaurant",
  pub: "restaurant",
  fast_food: "restaurant",
  ice_cream: "restaurant",
  bakery: "restaurant",

  // amenity – Wasser-Sport
  boat_rental: "bootsverleih",
  boat_storage: "bootsverleih",
  boat_sharing: "bootsverleih",
  boat_builder: "bootsverleih",
  boat_chandler: "bootsverleih",

  surf_school: "segelschule",
  sailing_school: "segelschule",
  dive_centre: "segelschule",
  diving_school: "segelschule",
  kite_school: "segelschule",

  // tourism
  hotel: "hotel",
  motel: "hotel",
  guest_house: "hotel",
  apartment: "hotel",
  camp_site: "camping",
  caravan_site: "camping",
  chalet: "camping",
  resort: "resort",

  // leisure
  marina: "marina",
  sailing_club: "segelverein",
  yacht_club: "segelverein",
  water_park: "sonstige",
  swimming_pool: "sonstige",
  beach_resort: "resort",
  sports_centre: "sonstige",

  // waterway
  boatyard: "bootsverleih",
  dock: "marina",
  harbour: "marina",
  ferry_terminal: "marina",

  // shop
  boat: "bootsverleih",
  outdoor: "sonstige",
  surf: "segelschule",
  fishing: "sonstige",

  // sport
  sailing: "segelverein",
  surfing: "segelschule",
  canoeing: "bootsverleih",
  kayaking: "bootsverleih",
  kitesurfing: "segelschule",
  diving: "segelschule",
};

/* ============================================= */
/*  HELPER FUNCTIONS                             */
/* ============================================= */
function determineKundentyp(tags: Record<string, string>): string {
  const priorityKeys = ["amenity", "tourism", "leisure", "waterway", "shop", "sport"];
  for (const key of priorityKeys) {
    const value = tags[key];
    if (value && KUNDENTYP_MAP[value]) return KUNDENTYP_MAP[value];
  }
  return "sonstige";
}

function determineWassertyp(tags: Record<string, string>): string | null {
  for (const value of Object.values(tags)) {
    if (WASSERTYP_MAP[value]) return WASSERTYP_MAP[value];
  }
  return null;
}

function determineFirmentyp(tags: Record<string, string>): "kette" | "einzeln" {
  if (tags.brand || tags.operator) return "kette";
  return "einzeln";
}

/* ============================================= */
/*  CORE FUNCTIONS                               */
/* ============================================= */

export async function getCompanies(
  client?: SupabaseClient,
  options?: { limit?: number; offset?: number; statusFilter?: string },
): Promise<Company[]> {
  const supabase = client || createClient();

  let query = supabase.from("companies").select("*");

  if (options?.statusFilter) {
    query = query.eq("status", options.statusFilter);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 1000) - 1);
  }

  const { data, error } = await query;

  if (process.env.NODE_ENV === "development") {
    console.group("getCompanies");
    console.log("Query options:", options);
    console.log("Result count:", data?.length);
    console.groupEnd();
  }

  if (error?.message) throw handleSupabaseError(error, "getCompanies");

  return (data ?? []) as Company[];
}

export async function getCompanyById(id: string, client: SupabaseClient): Promise<Company | null> {
  const { data, error } = await client.from("companies").select("*").eq("id", id).single();
  if (error?.message) throw handleSupabaseError(error, "getCompanyById");
  return (data as Company | null) ?? null;
}

export async function createCompany(values: CompanyInsert): Promise<Company> {
  const supabase = createClient();
  const { data, error } = await supabase.from("companies").insert(values).select().single();
  if (error) throw handleSupabaseError(error, "createCompany");
  return data;
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
  const supabase = createClient();
  const { data, error } = await supabase.from("companies").update(updates).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateCompany");
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteCompany");
}

export type CompanyForOpenMap = Pick<
  Database["public"]["Tables"]["companies"]["Row"],
  | "id"
  | "firmenname"
  | "kundentyp"
  | "status"
  | "lat"
  | "lon"
  | "strasse"
  | "stadt"
  | "land"
  | "plz"
  | "value"
  | "osm"
  | "telefon"
  | "website"
  | "firmentyp"
  | "wassertyp"
  | "wasserdistanz"
>;

export async function getCompaniesForOpenMap(userId: string): Promise<CompanyForOpenMap[]> {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isMockUser = userId === "dev-mock-user-11111111-2222-3333-4444-555555555555" || !userId;

  const supabase = createClient();

  let query = supabase
    .from("companies")
    .select(`
      id,
      firmenname,
      kundentyp,
      status,
      lat,
      lon,
      strasse,
      stadt,
      land,
      plz,
      value,
      osm,
      telefon,
      website,
      firmentyp,
      wassertyp,
      wasserdistanz
    `)
    .not("lat", "is", null)
    .not("lon", "is", null);

  if (!isDevelopment || !isMockUser) {
    query = query.eq("user_id", userId);
  }

  query = query.order("firmenname", { ascending: true });

  const { data, error } = await query;

  if (error) throw handleSupabaseError(error, "Failed to load companies for OpenMap");

  console.log(`[OpenMap] Loaded ${data?.length ?? 0} companies with geo data`);
  return data ?? [];
}

/**
 * Optimierte OSM-POI Import-Funktion mit firmentyp-Auto-Mapping
 */
export async function importOsmPoi(
  poi: {
    tags?: Record<string, string>;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    type: string;
    id: string;
  },
  userId: string,
) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isMockUser = userId === "dev-mock-user-11111111-2222-3333-4444-555555555555" || !userId;

  const supabase = createClient();

  const tags = poi.tags || {};
  const center = poi.center || poi;

  const osmId = `${poi.type}/${poi.id}`;

  const kundentyp = determineKundentyp(tags);
  const wassertyp = determineWassertyp(tags);
  const firmentyp = determineFirmentyp(tags);

  const firmenname = tags.name || tags["name:de"] || tags["name:en"] || `POI ${poi.id}`;

  const insertData: CompanyInsert & { user_id?: string } = {
    firmenname: firmenname.trim(),
    kundentyp,
    wassertyp,
    firmentyp,
    strasse: (tags["addr:street"] || "").trim() || null,
    plz: (tags["addr:postcode"] || "").trim() || null,
    stadt: (tags["addr:city"] || tags["addr:town"] || "").trim() || null,
    land: tags["addr:country"] === "DE" ? "Deutschland" : "Deutschland",
    telefon: (tags.phone || tags["contact:phone"] || "").trim() || null,
    website: (tags.website || tags["contact:website"] || "").trim() || null,
    lat: poi.lat ?? center.lat ?? null,
    lon: poi.lon ?? center.lon ?? null,
    osm: osmId,
    status: "lead",
    ...(isDevelopment && isMockUser ? {} : { user_id: userId }),
  };

  const { data, error } = await supabase.from("companies").insert(insertData).select().single();

  if (error) throw handleSupabaseError(error, "importOsmPoi");

  console.log(`[OpenMap] Successfully imported POI: ${data.firmenname} (${firmentyp})`);
  return data;
}
