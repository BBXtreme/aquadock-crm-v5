import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

import type { Company, CompanyInsert } from "../types";
import { handleSupabaseError } from "../utils";

/**
 * Get all companies
 */
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

/**
 * Get company by ID
 */
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
  | "stadt"
  | "land"
  | "value"
  | "osm"
  | "telefon"
  | "website"
>;

export async function getCompaniesForOpenMap(userId?: string): Promise<CompanyForOpenMap[]> {
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
      stadt,
      land,
      value,
      osm,
      telefon,
      website
    `)
    .not("lat", "is", null)
    .not("lon", "is", null)
    .order("firmenname", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) throw handleSupabaseError(error, "Failed to load companies for OpenMap");

  console.log(`[OpenMap] Loaded ${data?.length ?? 0} companies with geo data`);
  return data ?? [];
}

export async function importOsmPoi(poiData: any, userId: string) {
  const supabase = createClient();

  const kundentypMap: Record<string, string> = {
    restaurant: "restaurant",
    cafe: "restaurant",
    bar: "restaurant",
    hotel: "hotel",
    hostel: "hotel",
    camp_site: "camping",
    marina: "marina",
    boat_rental: "bootsverleih",
  };

  const values = {
    firmenname: poiData.tags?.name || "Unbenannter POI",
    kundentyp: kundentypMap[poiData.tags?.amenity] || "sonstige",
    strasse: poiData.tags?.["addr:street"] || "",
    plz: poiData.tags?.["addr:postcode"] || "",
    stadt: poiData.tags?.["addr:city"] || "",
    land: "Deutschland",
    telefon: poiData.tags?.phone || poiData.tags?.["contact:phone"] || "",
    website: poiData.tags?.website || poiData.tags?.["contact:website"] || "",
    lat: poiData.lat || poiData.center?.lat,
    lon: poiData.lon || poiData.center?.lon,
    osm: `${poiData.type}/${poiData.id}`,
    status: "lead",
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(values)
    .select()
    .single();

  if (error) throw handleSupabaseError(error, "Failed to import OSM POI");

  console.log(`[OpenMap] Imported OSM POI: ${data.firmenname}`);
  return data;
}
