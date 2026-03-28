import { z } from "zod";

// Zod schema for Contact creation/update based on form requirements
// Includes all fields used in ContactCreateForm
export const contactSchema = z.object({
  vorname: z.string().min(1, "Vorname ist erforderlich"),
  nachname: z.string().min(1, "Nachname ist erforderlich"),
  anrede: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  telefon: z.string().optional(),
  mobil: z.string().optional(),
  durchwahl: z.string().optional(),
  notes: z.string().optional(),
  company_id: z.string().optional(),
  is_primary: z.boolean().optional(),
});

// Type inference for the schema
export type ContactFormValues = z.infer<typeof contactSchema>;
