import { z } from "zod";

// Zod schema for Contact creation/update based on form requirements
// Includes all fields used in ContactCreateForm
// Security: All string fields are trimmed and have max length limits
export const contactSchema = z.object({
  vorname: z.string().min(1, "Vorname ist erforderlich").trim().max(100, "Vorname darf maximal 100 Zeichen lang sein"),
  nachname: z
    .string()
    .min(1, "Nachname ist erforderlich")
    .trim()
    .max(100, "Nachname darf maximal 100 Zeichen lang sein"),
  anrede: z.string().trim().max(20, "Anrede darf maximal 20 Zeichen lang sein").optional(),
  position: z.string().trim().max(100, "Position darf maximal 100 Zeichen lang sein").optional(),
  email: z.union([z.string().email("Ungültige E-Mail-Adresse").trim().max(254), z.literal("")]).optional(),
  telefon: z.string().trim().max(50, "Telefon darf maximal 50 Zeichen lang sein").optional(),
  mobil: z.string().trim().max(50, "Mobil darf maximal 50 Zeichen lang sein").optional(),
  durchwahl: z.string().trim().max(10, "Durchwahl darf maximal 10 Zeichen lang sein").optional(),
  notes: z.string().trim().max(2000, "Notizen dürfen maximal 2000 Zeichen lang sein").optional(),
  company_id: z.string().trim().max(36, "Company ID darf maximal 36 Zeichen lang sein").optional(),
  is_primary: z.boolean().optional(),
});

// Type inference for the schema
export type ContactFormValues = z.infer<typeof contactSchema>;
