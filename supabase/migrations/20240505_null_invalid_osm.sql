-- Null out invalid OSM IDs for companies without valid coordinates
UPDATE companies 
SET osm = NULL 
WHERE osm IS NOT NULL 
  AND (lat IS NULL OR lon IS NULL OR (lat = 0 AND lon = 0));