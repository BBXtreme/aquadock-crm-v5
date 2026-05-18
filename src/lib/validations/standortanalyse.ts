import { z } from "zod";

function emptyStringToNull(value: string | null | undefined): string | null | undefined {
  return value === "" ? null : value;
}

function parseNumericEnum(values: readonly number[], message: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    },
    z.number().refine((value) => values.includes(value), message),
  );
}

const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Name ist erforderlich").max(120, "Name darf maximal 120 Zeichen lang sein"),
    vorname: z
      .string()
      .trim()
      .min(1, "Vorname ist erforderlich")
      .max(120, "Vorname darf maximal 120 Zeichen lang sein"),
    email: z
      .string()
      .trim()
      .min(1, "E-Mail ist erforderlich")
      .email("Ungültige E-Mail-Adresse")
      .max(320, "E-Mail darf maximal 320 Zeichen lang sein"),
    strasse: z.string().trim().max(200, "Straße darf maximal 200 Zeichen lang sein").nullable().optional(),
    plz: z.string().trim().max(12, "PLZ darf maximal 12 Zeichen lang sein").nullable().optional(),
    ort: z.string().trim().max(120, "Ort darf maximal 120 Zeichen lang sein").nullable().optional(),
    telefon: z.string().trim().max(50, "Telefon darf maximal 50 Zeichen lang sein").nullable().optional(),
    firma: z.string().trim().max(180, "Firma darf maximal 180 Zeichen lang sein").nullable().optional(),
  })
  .strict();

const standortSchema = z
  .object({
    plz: z.string().trim().min(1, "PLZ ist erforderlich").max(12, "PLZ darf maximal 12 Zeichen lang sein"),
    ort: z.string().trim().min(1, "Ort ist erforderlich").max(120, "Ort darf maximal 120 Zeichen lang sein"),
    strasse: z.string().trim().max(200, "Straße darf maximal 200 Zeichen lang sein").nullable().optional(),
    land: z.string().trim().length(2, "Land muss als ISO-Code gespeichert werden"),
    datum: z.string().trim().min(1, "Datum ist erforderlich"),
    erstelltVon: z.string().trim().max(120, "Erstellt von darf maximal 120 Zeichen lang sein").nullable().optional(),
  })
  .strict();

const kriterienSchema = z
  .object({
    gewaesserart: z.enum(["See", "Fluss", "Küste"], { required_error: "Art des Gewässers ist erforderlich" }),
    standortfrequentierung: parseNumericEnum([25, 18, 10, 0, 1], "Ungültige Frequentierung"),
    gastronomie: parseNumericEnum([10, 6, 3, 0, 1], "Ungültige Gastronomie"),
    bekanntheit: parseNumericEnum([15, 10, 5, 0, 1], "Ungültige Bekanntheit"),
    zugaenglichkeit: parseNumericEnum([10, 7, 3, 0, 1], "Ungültige Zugänglichkeit"),
    saisonlaenge: parseNumericEnum([10, 7, 4, 0, 1], "Ungültige Saisonlänge"),
    wassertemperatur: parseNumericEnum([5, 3, 0, 1], "Ungültige Wassertemperatur"),
    sonnenstunden: parseNumericEnum([5, 3, 0, 1], "Ungültige Sonnenstunden"),
    einwohner: parseNumericEnum([10, 7, 4, 0, 1], "Ungültige Einwohnerzahl"),
    besucherstatistiken: parseNumericEnum([5, 3, 0, 1], "Ungültige Besucherstatistik"),
    attraktivitaet: parseNumericEnum([12, 9, 6, 3, 0, 1], "Ungültige Attraktivität"),
    wettbewerb: parseNumericEnum([5, 3, 0, 1], "Ungültiger Wettbewerb"),
    wasserzugang: parseNumericEnum([5, 3, 0, 1], "Ungültiger Wasserzugang"),
    genehmigungslage: parseNumericEnum([5, 3, 0, 1], "Ungültige Genehmigungslage"),
    sichtbarkeit: parseNumericEnum([5, 3, 0, 1], "Ungültige Sichtbarkeit"),
    erweiterbarkeit: parseNumericEnum([3, 2, 0, 1], "Ungültige Erweiterbarkeit"),
    lokalerPartner: parseNumericEnum([2, 0, 1], "Ungültiger lokaler Partner"),
    marketingpotenzial: parseNumericEnum([3, 2, 0, 1], "Ungültiges Marketingpotenzial"),
  })
  .strict();

export const standortanalyseFormSchema = z
  .object({
    kontakt: contactSchema.transform((value) => ({
      ...value,
      strasse: emptyStringToNull(value.strasse ?? null),
      plz: emptyStringToNull(value.plz ?? null),
      ort: emptyStringToNull(value.ort ?? null),
      telefon: emptyStringToNull(value.telefon ?? null),
      firma: emptyStringToNull(value.firma ?? null),
    })),
    standort: standortSchema.transform((value) => ({
      ...value,
      strasse: emptyStringToNull(value.strasse ?? null),
      erstelltVon: emptyStringToNull(value.erstelltVon ?? null),
    })),
    kriterien: kriterienSchema,
    notizen: z
      .string()
      .trim()
      .max(3000, "Notizen dürfen maximal 3000 Zeichen lang sein")
      .nullable()
      .optional()
      .transform(emptyStringToNull),
  })
  .strict();

export type StandortanalyseForm = z.infer<typeof standortanalyseFormSchema>;
