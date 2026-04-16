-- One-time cleanup for corrupted company coordinates from legacy CSV imports.
-- Safe usage: run manually in Supabase SQL Editor after backup/confirmation.
-- Effect: nulls invalid WGS84 values; does not touch already-valid coordinates.

UPDATE public.companies
SET
  lat = NULL,
  lon = NULL
WHERE deleted_at IS NULL
  AND (
    (lat IS NOT NULL AND (lat < -90 OR lat > 90))
    OR (lon IS NOT NULL AND (lon < -180 OR lon > 180))
  );
