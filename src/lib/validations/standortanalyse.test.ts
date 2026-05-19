import { describe, expect, it } from "vitest";
import { standortanalyseFormSchema } from "./standortanalyse";

const validPayload = {
  kontakt: {
    name: "Mustermann",
    vorname: "Max",
    email: "max@example.com",
    strasse: "",
    plz: "",
    ort: "",
    telefon: "+49 171 1234567",
    firma: "",
  },
  standort: {
    plz: "10115",
    ort: "Berlin",
    strasse: "Musterweg 1",
    land: "de",
    datum: "2026-05-18",
    erstelltVon: "",
  },
  kriterien: {
    gewaesserart: "See",
    standortfrequentierung: 25,
    gastronomie: 10,
    bekanntheit: 15,
    zugaenglichkeit: 10,
    saisonlaenge: 10,
    wassertemperatur: 5,
    sonnenstunden: 5,
    einwohner: 10,
    besucherstatistiken: 5,
    attraktivitaet: 12,
    wettbewerb: 5,
    wasserzugang: 5,
    genehmigungslage: 5,
    sichtbarkeit: 5,
    erweiterbarkeit: 3,
    lokalerPartner: 2,
    marketingpotenzial: 3,
  },
  notizen: "",
} as const;

describe("standortanalyseFormSchema", () => {
  it("normalizes nullable fields and uppercases land code", () => {
    const parsed = standortanalyseFormSchema.parse(validPayload);
    expect(parsed.kontakt.strasse).toBeNull();
    expect(parsed.kontakt.plz).toBeNull();
    expect(parsed.kontakt.firma).toBeNull();
    expect(parsed.standort.erstelltVon).toBeNull();
    expect(parsed.notizen).toBeNull();
    expect(parsed.standort.land).toBe("DE");
  });

  it("rejects invalid postal code characters", () => {
    const result = standortanalyseFormSchema.safeParse({
      ...validPayload,
      standort: {
        ...validPayload.standort,
        plz: "10@15",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format and impossible dates", () => {
    const wrongFormat = standortanalyseFormSchema.safeParse({
      ...validPayload,
      standort: {
        ...validPayload.standort,
        datum: "18.05.2026",
      },
    });
    expect(wrongFormat.success).toBe(false);

    const impossibleDate = standortanalyseFormSchema.safeParse({
      ...validPayload,
      standort: {
        ...validPayload.standort,
        datum: "2026-02-30",
      },
    });
    expect(impossibleDate.success).toBe(false);
  });

  it("rejects invalid phone numbers when provided", () => {
    const result = standortanalyseFormSchema.safeParse({
      ...validPayload,
      kontakt: {
        ...validPayload.kontakt,
        telefon: "abc-def",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields under strict mode", () => {
    const result = standortanalyseFormSchema.safeParse({
      ...validPayload,
      extra: "not-allowed",
    } as Record<string, unknown>);
    expect(result.success).toBe(false);
  });

  it("coerces numeric criterion values provided as strings", () => {
    const result = standortanalyseFormSchema.safeParse({
      ...validPayload,
      kriterien: {
        ...validPayload.kriterien,
        standortfrequentierung: "25",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kriterien.standortfrequentierung).toBe(25);
    }
  });

  it("rejects invalid numeric criterion values", () => {
    const result = standortanalyseFormSchema.safeParse({
      ...validPayload,
      kriterien: {
        ...validPayload.kriterien,
        standortfrequentierung: 99,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid gewaesserart values", () => {
    const result = standortanalyseFormSchema.safeParse({
      ...validPayload,
      kriterien: {
        ...validPayload.kriterien,
        gewaesserart: "Ocean",
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts all canonical wassertyp values as gewaesserart", () => {
    const result = standortanalyseFormSchema.safeParse({
      ...validPayload,
      kriterien: {
        ...validPayload.kriterien,
        gewaesserart: "Hafen",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kriterien.gewaesserart).toBe("Hafen");
    }
  });
});
