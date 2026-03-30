/**
 * src/lib/dto/company.dto.ts
 * DTO for company create/edit forms.
 * Contains the essential fields required for form submission and validation.
 * Optional fields are marked as such to allow partial updates.
 */
export type CompanyFormDTO = {
  /** Company name (required) */
  firmenname: string;
  /** Customer type (required) */
  kundentyp: string;
  /** Company status (required) */
  status: string;
  /** Estimated deal value (optional) */
  value?: number | null | undefined;
  /** Legal form (optional) */
  rechtsform?: string | null | undefined;
  /** Company type (optional) */
  firmentyp?: string | null | undefined;
  /** Street address (optional) */
  strasse?: string | null | undefined;
  /** Postal code (optional) */
  plz?: string | null | undefined;
  /** City (optional) */
  stadt?: string | null | undefined;
  /** State/Province (optional) */
  bundesland?: string | null | undefined;
  /** Country (optional) */
  land?: string | null | undefined;
  /** Phone number (optional) */
  telefon?: string | null | undefined;
  /** Email address (optional) */
  email?: string | null | undefined;
  /** Website URL (optional) */
  website?: string | null | undefined;
  /** Latitude (optional) */
  lat?: number | null | undefined;
  /** Longitude (optional) */
  lon?: number | null | undefined;
  /** OSM link (optional) */
  osm?: string | null | undefined;
  /** Distance to water (optional) */
  wasserdistanz?: number | null | undefined;
  /** Water type (optional) */
  wassertyp?: string | null | undefined;
  /** Notes (optional) */
  notes?: string | null | undefined;
};
