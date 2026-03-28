import { z } from "zod";

// Zod schema for Contact creation/update based on Database["public"]["Tables"]["contacts"]["Insert"]
// Excludes auto-generated fields: id, created_at, updated_at, user_id
export const contactSchema = z.object({
  vorname: z.string().min(1, "Vorname ist erforderlich"),
  nachname: z.string().min(1, "Nachname ist erforderlich"),
  anrede: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  telefon: z.string().optional(),
  company_id: z.string().uuid().optional(),
});

// Type inference for the schema
export type ContactFormValues = z.infer<typeof contactSchema>;
