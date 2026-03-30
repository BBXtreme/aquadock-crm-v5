/**
 * DTO for contact create/edit forms.
 * Contains the essential fields required for form submission and validation.
 * Optional fields are marked as such to allow partial updates.
 */
export type ContactFormDTO = {
  /** First name (required) */
  vorname: string;
  /** Last name (required) */
  nachname: string;
  /** Salutation (optional) */
  anrede?: string | null;
  /** Position/Title (optional) */
  position?: string | null;
  /** Email address (optional) */
  email?: string | null;
  /** Phone number (optional) */
  telefon?: string | null;
  /** Mobile number (optional) */
  mobil?: string | null;
  /** Extension (optional) */
  durchwahl?: string | null;
  /** Notes (optional) */
  notes?: string | null;
  /** Associated company ID (optional) */
  company_id?: string | null;
  /** Whether this is the primary contact (optional) */
  is_primary?: boolean | null;
};
