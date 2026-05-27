import { describe, expect, it } from "vitest";
import { partnerApplicationSubmitSchema } from "./partner-application";

const basePayload = {
  locale: "de" as const,
  firstName: "Max",
  lastName: "Mustermann",
  email: "max@example.com",
  phone: "+491511234567",
  countryCode: "DE",
  cityRegion: "Frankfurt",
  proposedTerritory: "Hessen und Rhein-Main Gebiet",
  yearsSalesExperience: 0,
  industryExperience: ["b2b_sales"] as const,
  motivation: "Ich möchte AquaDock in meiner Region vertreiben und habe ein starkes Netzwerk.",
  handelsvertreterAck: true,
  gdprConsent: true as const,
};

describe("partnerApplicationSubmitSchema", () => {
  it("requires cvUploadToken for DACH applicants", () => {
    const result = partnerApplicationSubmitSchema.safeParse(basePayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "cv_required")).toBe(true);
    }
  });

  it("accepts optional cv for non-DACH with no experience", () => {
    const result = partnerApplicationSubmitSchema.safeParse({
      ...basePayload,
      countryCode: "HR",
      handelsvertreterAck: false,
    });
    expect(result.success).toBe(true);
  });

  it("requires handelsvertreter ack for DACH", () => {
    const result = partnerApplicationSubmitSchema.safeParse({
      ...basePayload,
      handelsvertreterAck: false,
      cvUploadToken: "token",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "handelsvertreter_ack_required")).toBe(
        true,
      );
    }
  });
});
