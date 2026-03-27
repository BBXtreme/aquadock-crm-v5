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
  hostel: "hotel",
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
  diving: "segelschule",
  fishing: "sonstige",

  // sport
  sailing: "segelverein",
  surfing: "segelschule",
  canoeing: "bootsverleih",
  kayaking: "bootsverleih",
  kitesurfing: "segelschule",
  diving: "segelschule",
};

const WASSERTYP_MAP: Record<string, string> = {
  marina: "Hafen",
  dock: "Hafen",
  boatyard: "Hafen",
  harbour: "Hafen",
  canal: "Kanal",
  river: "Fluss",
  stream: "Bach",
  sea: "Küste / Meer",
  bay: "Küste / Meer",
  ocean: "Küste / Meer",
  lake: "See",
  water: "See",
  swimming_area: "Badesee",
  water_park: "Badesee",
  reservoir: "Stausee",
  pond: "Teich",
  beach: "Küste / Meer",
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

/* ============================================= */
/*  MAIN FUNCTIONS (unverändert außer importOsmPoi) */
/* ============================================= */
export async function getCompanies(/* ... */) { /* unchanged */ }
export async function getCompanyById(/* ... */) { /* unchanged */ }
export async function createCompany(/* ... */) { /* unchanged */ }
export async function updateCompany(/* ... */) { /* unchanged */ }
export async function deleteCompany(/* ... */) { /* unchanged */ }
export type CompanyForOpenMap = /* unchanged */;

export async function getCompaniesForOpenMap(userId: string): Promise<CompanyForOpenMap[]> {
  /* unchanged */
}

/**
 * Optimierte OSM-POI Import-Funktion
 */
export async function importOsmPoi(poi: {
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  type: string;
  id: string;
}, userId: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isMockUser = userId === "dev-mock-user-11111111-2222-3333-4444-555555555555" || !userId;

  const supabase = createClient();

  const tags = poi.tags || {};
  const center = poi.center || poi;

  const osmId = `${poi.type}/${poi.id}`;

  const kundentyp = determineKundentyp(tags);
  const wassertyp = determineWassertyp(tags);

  const firmenname = tags.name || tags["name:de"] || tags["name:en"] || `POI ${poi.id}`;

  const insertData: CompanyInsert & { user_id?: string } = {
    firmenname: firmenname.trim(),
    kundentyp,
    wassertyp,
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

  const { data, error } = await supabase
    .from("companies")
    .insert(insertData)
    .select()
    .single();

  if (error) throw handleSupabaseError(error, "importOsmPoi");

  console.log(`[OpenMap] Successfully imported POI: ${data.firmenname}`);
  return data;
}