import type { Contact } from "@/types/database.types";

/** Contact + company join shape used by Brevo sync and recipient picker (not the contacts table `firmenname` variant). */
export type BrevoContactWithCompany = Contact & {
  companies: { kundentyp: string | null; status: string | null } | null;
};
