// scripts/geocode-osm.ts
// Bulk geocode companies with OSM IDs but missing lat/lon

import { config } from "dotenv";

config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get companies with osm but invalid lat/lon (null or 0,0)
  const { data: companies } = await supabase
    .from("companies")
    .select("id, osm, lat, lon")
    .not("osm", "is", null)
    .or('and(lat.is.null,lon.is.null),and(lat.eq.0,lon.eq.0)');

  if (!companies || companies.length === 0) {
    console.log("No companies to geocode.");
    return;
  }

  console.log(`Geocoding ${companies.length} companies...`);

  let updated = 0;

  for (const company of companies) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${company.osm}&format=json`, {
        headers: { "User-Agent": "AquadockCRM/1.0" },
      });

      if (!res.ok) {
        console.log(`API error for ${company.osm}: ${res.status} ${res.statusText}`);
        throw new Error("Nominatim API error");
      }

      const data = await res.json();

      if (data && data.length > 0 && data[0].lat && data[0].lon) {
        const lat = Number(data[0].lat);
        const lon = Number(data[0].lon);

        await supabase
          .from("companies")
          .update({ lat, lon })
          .eq("id", company.id);
        updated++;
        console.log(`Updated ${company.osm}: ${lat}, ${lon}`);
      } else {
        console.log(`No result for ${company.osm}`);
      }

      // Delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to geocode ${company.osm}:`, error);
    }
  }

  console.log(`Successfully updated ${updated} companies.`);
}

main().catch(console.error);