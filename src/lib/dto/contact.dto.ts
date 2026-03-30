/**
 * src/lib/dto/contact.dto.ts
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
  anrede?: string;
  /** Position/Title (optional) */
  position?: string;
  /** Email address (optional) */
  email?: string;
  /** Phone number (optional) */
  telefon?: string;
  /** Mobile number (optional) */
  mobil?: string;
  /** Extension (optional) */
  durchwahl?: string;
  /** Notes (optional) */
  notes?: string;
  /** Associated company ID (optional) */
  company_id?: string | null;
  /** Whether this is the primary contact (optional) */
  is_primary?: boolean;
};
