import { z } from "zod";
import { WASSERTYP_ALLOWED_VALUES } from "@/lib/constants/wassertyp";

function emptyStringToNull(value: string | null | undefined): string | null | undefined {
  return value === "" ? null : value;
}

const postalCodeRegex = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/;
const phoneRegex = /^\+?[0-9()[\]\s./-]{6,50}$/;

function parseNumericEnum(values: readonly number[], message: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    },
    z
      .number({
        required_error: "Bitte eine Auswahl treffen",
        invalid_type_error: "Bitte eine Auswahl treffen",
      })
      .refine((value) => values.includes(value), message),
  );
}

function isValidDateInput(value: string): boolean {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return new Date(timestamp).toISOString().slice(0, 10) === value;
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
    plz: z
      .string()
      .trim()
      .max(12, "PLZ darf maximal 12 Zeichen lang sein")
      .nullable()
      .optional()
      .refine(
        (value) => value == null || value.length === 0 || postalCodeRegex.test(value),
        "PLZ darf nur Buchstaben, Zahlen, Leerzeichen und Bindestriche enthalten",
      ),
    ort: z.string().trim().max(120, "Ort darf maximal 120 Zeichen lang sein").nullable().optional(),
    telefon: z
      .string()
      .trim()
      .max(50, "Telefon darf maximal 50 Zeichen lang sein")
      .nullable()
      .optional()
      .refine(
        (value) => value == null || value.length === 0 || (phoneRegex.test(value) && /\d/.test(value)),
        "Telefonnummer hat ein ungültiges Format",
      ),
    firma: z.string().trim().max(180, "Firma darf maximal 180 Zeichen lang sein").nullable().optional(),
  })
  .strict();

const standortSchema = z
  .object({
    plz: z
      .string()
      .trim()
      .min(1, "PLZ ist erforderlich")
      .max(12, "PLZ darf maximal 12 Zeichen lang sein")
      .regex(postalCodeRegex, "PLZ darf nur Buchstaben, Zahlen, Leerzeichen und Bindestriche enthalten"),
    ort: z.string().trim().min(1, "Ort ist erforderlich").max(120, "Ort darf maximal 120 Zeichen lang sein"),
    strasse: z.string().trim().max(200, "Straße darf maximal 200 Zeichen lang sein").nullable().optional(),
    land: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Land muss als ISO-2-Code gespeichert werden"),
    datum: z
      .string()
      .trim()
      .min(1, "Datum ist erforderlich")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datumsformat (technisch: JJJJ-MM-TT)")
      .refine((value) => isValidDateInput(value), "Ungültiges Datum"),
    erstelltVon: z.string().trim().max(120, "Erstellt von darf maximal 120 Zeichen lang sein").nullable().optional(),
  })
  .strict();

const kriterienSchema = z
  .object({
    gewaesserart: z.enum(WASSERTYP_ALLOWED_VALUES, {
      required_error: "Art des Gewässers ist erforderlich",
      invalid_type_error: "Art des Gewässers ist erforderlich",
    }),
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
