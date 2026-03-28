import { z } from "zod";

// Zod schema for Company creation/update based on Database["public"]["Tables"]["companies"]["Insert"]
// Excludes auto-generated fields: id, created_at, updated_at, user_id
export const companySchema = z.object({
  firmenname: z.string().min(1, "Firmenname ist erforderlich"),
  rechtsform: z.string().optional(),
  kundentyp: z.enum(
    ["restaurant", "hotel", "marina", "camping", "sonstige"],
    { errorMap: () => ({ message: "Ungültiger Kundentyp" }) }
  ),
  firmentyp: z.enum(["kette", "einzeln"]).optional(),
  status: z.enum(
    ["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren"],
    { errorMap: () => ({ message: "Ungültiger Status" }) }
  ),
  value: z.number().int().min(0, "Wert muss eine positive ganze Zahl sein").optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  osm: z.string().optional(),
});

// Type inference for the schema
export type CompanyFormValues = z.infer<typeof companySchema>;
