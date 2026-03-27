// src/lib/constants/kundentyp.ts
// OSM-based Kundentyp mapping + helper functions

/* ============================================= */
/*  OSM TAG MAPPINGS (erweitert März 2026)      */
/* ============================================= */
export const KUNDENTYP_MAP: Record<string, string> = {
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
export function determineKundentyp(tags: Record<string, string>): string {
  const priorityKeys = ["amenity", "tourism", "leisure", "waterway", "shop", "sport"];
  for (const key of priorityKeys) {
    const value = tags[key];
    if (value && KUNDENTYP_MAP[value]) return KUNDENTYP_MAP[value];
  }
  return "sonstige";
}

export function determineFirmentyp(tags: Record<string, string>): "kette" | "einzeln" {
  if (tags.brand || tags.operator) return "kette";
  return "einzeln";
}
