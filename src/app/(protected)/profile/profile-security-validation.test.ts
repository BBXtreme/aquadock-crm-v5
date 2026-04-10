import { describe, expect, it } from "vitest";

import { changeEmailSchema, changePasswordSchema } from "@/lib/validations/profile";

describe("Profile security schemas", () => {
  it("changePasswordSchema accepts matching passwords", () => {
    const parsed = changePasswordSchema.safeParse({
      new_password: "validpass8",
      confirm_password: "validpass8",
    });
    expect(parsed.success).toBe(true);
  });

  it("changePasswordSchema rejects mismatch", () => {
    const parsed = changePasswordSchema.safeParse({
      new_password: "validpass8",
      confirm_password: "otherxxxx",
    });
    expect(parsed.success).toBe(false);
  });

  it("changeEmailSchema accepts valid email", () => {
    const parsed = changeEmailSchema.safeParse({ new_email: "a@b.co" });
    expect(parsed.success).toBe(true);
  });
});
