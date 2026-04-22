import { describe, expect, it } from "vitest";
import { companySchema } from "@/lib/validations/company";
import { updateCompanyWithOwnerInputSchema } from "@/lib/validations/company-owner";

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("updateCompanyWithOwnerInputSchema", () => {
  const minimalCompany = companySchema.parse({
    firmenname: "Acme GmbH",
    kundentyp: "restaurant",
    status: "lead",
  });

  it("accepts valid payload with owner uuid and sync flag", () => {
    const parsed = updateCompanyWithOwnerInputSchema.parse({
      id: COMPANY_ID,
      company: minimalCompany,
      user_id: USER_ID,
      sync_contact_owners: true,
    });
    expect(parsed.id).toBe(COMPANY_ID);
    expect(parsed.user_id).toBe(USER_ID);
    expect(parsed.sync_contact_owners).toBe(true);
  });

  it("accepts null user_id", () => {
    const parsed = updateCompanyWithOwnerInputSchema.parse({
      id: COMPANY_ID,
      company: minimalCompany,
      user_id: null,
      sync_contact_owners: false,
    });
    expect(parsed.user_id).toBeNull();
  });

  it("rejects invalid company id", () => {
    expect(() =>
      updateCompanyWithOwnerInputSchema.parse({
        id: "not-a-uuid",
        company: minimalCompany,
        user_id: USER_ID,
        sync_contact_owners: false,
      }),
    ).toThrow();
  });

  it("rejects invalid owner uuid string", () => {
    expect(() =>
      updateCompanyWithOwnerInputSchema.parse({
        id: COMPANY_ID,
        company: minimalCompany,
        user_id: "nope",
        sync_contact_owners: false,
      }),
    ).toThrow();
  });

  it("rejects unknown top-level keys", () => {
    expect(() =>
      updateCompanyWithOwnerInputSchema.parse({
        id: COMPANY_ID,
        company: minimalCompany,
        user_id: USER_ID,
        sync_contact_owners: false,
        extra: 1,
      }),
    ).toThrow();
  });

  it("rejects invalid nested company", () => {
    expect(() =>
      updateCompanyWithOwnerInputSchema.parse({
        id: COMPANY_ID,
        company: { ...minimalCompany, firmenname: "" },
        user_id: USER_ID,
        sync_contact_owners: false,
      }),
    ).toThrow();
  });
});
