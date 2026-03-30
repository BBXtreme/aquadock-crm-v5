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
  anrede?: string | null | undefined;
  /** Position/Title (optional) */
  position?: string | null | undefined;
  /** Email address (optional) */
  email?: string | null | undefined;
  /** Phone number (optional) */
  telefon?: string | null | undefined;
  /** Mobile number (optional) */
  mobil?: string | null | undefined;
  /** Extension (optional) */
  durchwahl?: string | null | undefined;
  /** Notes (optional) */
  notes?: string | null | undefined;
  /** Associated company ID (optional) */
  company_id?: string | null | undefined;
  /** Whether this is the primary contact (optional) */
  is_primary?: boolean | null | undefined;
};
