-- =============================================================================
-- Normalize companies.land to ISO 3166-1 alpha-2 (uppercase)
-- =============================================================================
--
-- Purpose
--   Migrate legacy CRM values (German country labels from forms/imports) and
--   common synonyms to canonical ISO codes (DE, AT, CH, …). Aligns DB with
--   src/lib/countries/iso-land.ts normalization used by the app.
--
-- When to run
--   One-time in Supabase SQL Editor (or migration pipeline) after backup.
--   Prefer maintenance window; verify counts before/after.
--
-- Preconditions
--   • Backup or snapshot available (rollback = restore backup; inverse UPDATE
--     is lossy if multiple legacy strings mapped to one ISO code).
--   • Review unmappable values after verification queries below.
--
-- Execution order
--   1) Trim whitespace; empty string → NULL
--   2) Map legacy full names / synonyms (lower(trim(land)) match)
--   3) Uppercase two-letter alphabetic codes (e.g. de → DE)
--   4) Optional: ADD CONSTRAINT (see bottom; keep commented until verified)
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Trim surrounding whitespace on land
-- -----------------------------------------------------------------------------
UPDATE public.companies
SET land = trim(land)
WHERE deleted_at IS NULL
  AND land IS NOT NULL
  AND land <> trim(land);

-- -----------------------------------------------------------------------------
-- 1b) Empty land after trim → NULL
-- -----------------------------------------------------------------------------
UPDATE public.companies
SET land = NULL
WHERE deleted_at IS NULL
  AND land IS NOT NULL
  AND trim(land) = '';

-- -----------------------------------------------------------------------------
-- 2) Legacy labels & synonyms → ISO alpha-2 (matches deprecated German land labels + common EN)
-- -----------------------------------------------------------------------------
UPDATE public.companies AS c
SET land = m.iso
FROM (
  SELECT *
  FROM (
    VALUES
      ('deutschland', 'DE'),
      ('germany', 'DE'),
      ('österreich', 'AT'),
      ('osterreich', 'AT'),
      ('austria', 'AT'),
      ('schweiz', 'CH'),
      ('switzerland', 'CH'),
      ('frankreich', 'FR'),
      ('france', 'FR'),
      ('italien', 'IT'),
      ('italy', 'IT'),
      ('spanien', 'ES'),
      ('spain', 'ES'),
      ('niederlande', 'NL'),
      ('niederlanden', 'NL'),
      ('netherlands', 'NL'),
      ('holland', 'NL'),
      ('belgien', 'BE'),
      ('belgium', 'BE'),
      ('belgique', 'BE'),
      ('dänemark', 'DK'),
      ('danemark', 'DK'),
      ('denmark', 'DK'),
      ('schweden', 'SE'),
      ('sweden', 'SE'),
      ('norwegen', 'NO'),
      ('norway', 'NO'),
      ('polen', 'PL'),
      ('poland', 'PL'),
      ('ungarn', 'HU'),
      ('hungary', 'HU'),
      ('griechenland', 'GR'),
      ('greece', 'GR'),
      ('ellada', 'GR'),
      ('portugal', 'PT'),
      ('großbritannien', 'GB'),
      ('grossbritannien', 'GB'),
      ('vereinigtes königreich', 'GB'),
      ('vereinigtes konigreich', 'GB'),
      ('united kingdom', 'GB'),
      ('great britain', 'GB'),
      ('uk', 'GB'),
      ('kroatien', 'HR'),
      ('croatia', 'HR'),
      ('hrvatska', 'HR'),
      ('italija', 'IT')
  ) AS t(legacy_lower, iso)
) AS m
WHERE c.deleted_at IS NULL
  AND c.land IS NOT NULL
  AND lower(trim(c.land)) = m.legacy_lower;

-- -----------------------------------------------------------------------------
-- 3) Lowercase ISO-like codes → uppercase (DE already unchanged)
-- -----------------------------------------------------------------------------
UPDATE public.companies
SET land = upper(trim(land))
WHERE deleted_at IS NULL
  AND land IS NOT NULL
  AND trim(land) ~ '^[a-zA-Z]{2}$'
  AND length(trim(land)) = 2
  AND trim(land) <> upper(trim(land));

-- =============================================================================
-- Verification (run manually; do not leave automated jobs relying on these)
-- =============================================================================
--
-- Distribution after migration:
--   SELECT land, count(*) AS n
--   FROM public.companies
--   WHERE deleted_at IS NULL
--   GROUP BY land
--   ORDER BY n DESC NULLS LAST;
--
-- Rows whose land is still not ISO-shaped (manual cleanup / second pass):
--   SELECT id, firmenname, land
--   FROM public.companies
--   WHERE deleted_at IS NULL
--     AND land IS NOT NULL
--     AND land !~ '^[A-Z]{2}$';
--
-- =============================================================================
-- Optional hardening (ONLY after counts look correct)
-- =============================================================================
--
-- Enforces uppercase ISO or NULL. Apply via Supabase migration workflow and
-- regenerate app types: pnpm supabase:types
--
-- ALTER TABLE public.companies
--   ADD CONSTRAINT companies_land_iso_alpha2_chk
--   CHECK (land IS NULL OR land ~ '^[A-Z]{2}$');
--
