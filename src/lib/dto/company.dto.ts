// src/lib/dto/contact.dto.ts
/**
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
  value?: number | null;
  /** Legal form (optional) */
  rechtsform?: string | null;
  /** Company type (optional) */
  firmentyp?: string | null;
  /** Street address (optional) */
  strasse?: string | null;
  /** Postal code (optional) */
  plz?: string | null;
  /** City (optional) */
  stadt?: string | null;
  /** State/Province (optional) */
  bundesland?: string | null;
  /** Country (optional) */
  land?: string | null;
  /** Phone number (optional) */
  telefon?: string | null;
  /** Email address (optional) */
  email?: string | null;
  /** Website URL (optional) */
  website?: string | null;
  /** Latitude (optional) */
  lat?: number | null;
  /** Longitude (optional) */
  lon?: number | null;
  /** OSM link (optional) */
  osm?: string | null;
  /** Distance to water (optional) */
  wasserdistanz?: number | null;
  /** Water type (optional) */
  wassertyp?: string | null;
};
