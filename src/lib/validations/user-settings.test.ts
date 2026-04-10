/**
 * User/profile preferences and `user_settings`-oriented Zod validation.
 * `display_name` rules mirror {@link ../../components/features/profile/ProfileForm.tsx} (not yet extracted to validations).
 */

import { describe, expect, it, test } from "vitest";
import { z } from "zod";
import type { UserRole } from "@/lib/auth/types";
import {
  PROFILE_AVATAR_MAX_BYTES,
  parseProfileAvatarFile,
  profileAvatarSchema,
} from "@/lib/validations/profile";
import {
  appearanceColorSchemeSchema,
  appearanceLocaleSchema,
  appearanceThemeSchema,
  appearanceTimeZoneSchema,
  notificationPreferencesSchema,
  parseAppearanceColorScheme,
  parseAppearanceLocale,
  parseAppearanceTheme,
  parseAppearanceTimeZone,
  trashBinPreferenceSchema,
} from "@/lib/validations/settings";

/** Same shape/messages as ProfileForm `displayNameSchema` (non-strict object strips unknown keys). */
const displayNameSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters"),
});

const displayNameSchemaStrict = displayNameSchema.strict();

const userRoleSchema = z.enum(["user", "admin"]);

describe("displayNameSchema (ProfileForm parity)", () => {
  it("accepts a normal display name", () => {
    const parsed = displayNameSchema.parse({ display_name: "Erika Muster" });
    expect(parsed.display_name).toBe("Erika Muster");
  });

  it("rejects empty display_name", () => {
    const result = displayNameSchema.safeParse({ display_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects display_name longer than 50 characters", () => {
    const result = displayNameSchema.safeParse({ display_name: "x".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("accepts display_name of exactly 50 characters", () => {
    const name = "x".repeat(50);
    const parsed = displayNameSchema.parse({ display_name: name });
    expect(parsed.display_name).toBe(name);
  });

  it("strips unknown keys when object is not strict", () => {
    const parsed = displayNameSchema.parse({
      display_name: "Valid",
      extra: "ignored",
    } as { display_name: string; extra: string });
    expect(parsed).toEqual({ display_name: "Valid" });
  });
});

describe("displayNameSchemaStrict", () => {
  it("rejects unknown keys in strict mode", () => {
    const result = displayNameSchemaStrict.safeParse({
      display_name: "Valid",
      extra: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("userRoleSchema", () => {
  test.each(["user", "admin"] as const)("accepts role %s", (role) => {
    const parsed = userRoleSchema.parse(role);
    expect(parsed).toBe(role);
    const typed: UserRole = parsed;
    expect(typed).toBe(role);
  });

  it("rejects invalid roles", () => {
    expect(userRoleSchema.safeParse("superadmin").success).toBe(false);
    expect(userRoleSchema.safeParse("").success).toBe(false);
    expect(userRoleSchema.safeParse(null).success).toBe(false);
  });
});

describe("notificationPreferencesSchema (json / user_settings value shape)", () => {
  const valid = { pushEnabled: true, emailEnabled: false };

  it("parses values typical of JSONB round-trip", () => {
    const raw = JSON.stringify(valid);
    const parsedJson: unknown = JSON.parse(raw);
    const parsed = notificationPreferencesSchema.parse(parsedJson);
    expect(parsed).toEqual(valid);
  });

  it("rejects unknown keys in strict mode", () => {
    const result = notificationPreferencesSchema.safeParse({
      ...valid,
      unknownFlag: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong value types", () => {
    expect(
      notificationPreferencesSchema.safeParse({
        pushEnabled: "yes",
        emailEnabled: false,
      }).success,
    ).toBe(false);
  });
});

describe("trashBinPreferenceSchema", () => {
  it("accepts boolean trashBinEnabled", () => {
    const parsed = trashBinPreferenceSchema.parse({ trashBinEnabled: true });
    expect(parsed.trashBinEnabled).toBe(true);
  });

  it("rejects unknown keys in strict mode", () => {
    const result = trashBinPreferenceSchema.safeParse({
      trashBinEnabled: false,
      extra: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("profileAvatarSchema", () => {
  it("accepts null avatar_url", () => {
    const parsed = profileAvatarSchema.parse({ avatar_url: null });
    expect(parsed.avatar_url).toBeNull();
  });

  it("accepts a valid https URL", () => {
    const url = "https://example.com/a.png";
    const parsed = profileAvatarSchema.parse({ avatar_url: url });
    expect(parsed.avatar_url).toBe(url);
  });

  it("rejects invalid URL strings", () => {
    const result = profileAvatarSchema.safeParse({ avatar_url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys in strict mode", () => {
    const result = profileAvatarSchema.safeParse({
      avatar_url: null,
      extra: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("parseProfileAvatarFile", () => {
  it("accepts a small PNG file within size limit", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const file = new File([bytes], "avatar.png", { type: "image/png" });
    expect(() => parseProfileAvatarFile(file)).not.toThrow();
  });

  it("rejects files larger than PROFILE_AVATAR_MAX_BYTES", () => {
    const big = new Uint8Array(PROFILE_AVATAR_MAX_BYTES + 1);
    const file = new File([big], "huge.png", { type: "image/png" });
    expect(() => parseProfileAvatarFile(file)).toThrow();
  });

  it("rejects disallowed mime types", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" });
    expect(() => parseProfileAvatarFile(file)).toThrow();
  });
});

describe("appearance settings (locale / theme / timezone null and edge cases)", () => {
  it("parse helpers return null for null, undefined, or non-strings", () => {
    expect(parseAppearanceTheme(null)).toBeNull();
    expect(parseAppearanceTheme(undefined)).toBeNull();
    expect(parseAppearanceTheme(1)).toBeNull();
    expect(parseAppearanceLocale(null)).toBeNull();
    expect(parseAppearanceColorScheme(undefined)).toBeNull();
    expect(parseAppearanceTimeZone(null)).toBeNull();
  });

  it("maps legacy locale fr to de", () => {
    expect(parseAppearanceLocale("fr")).toBe("de");
    expect(parseAppearanceLocale("  fr  ")).toBe("de");
  });

  it("returns null for invalid locale string", () => {
    expect(parseAppearanceLocale("xx")).toBeNull();
  });

  it("parseAppearanceColorScheme trims and validates known ids", () => {
    expect(parseAppearanceColorScheme("  teal  ")).toBe("teal");
    expect(parseAppearanceColorScheme("unknown-scheme")).toBeNull();
  });

  it("appearanceTimeZoneSchema rejects empty and invalid IANA ids", () => {
    expect(appearanceTimeZoneSchema.safeParse("").success).toBe(false);
    expect(appearanceTimeZoneSchema.safeParse("   ").success).toBe(false);
    expect(appearanceTimeZoneSchema.safeParse("Not/A/Zone").success).toBe(false);
  });

  it("appearanceTimeZoneSchema accepts a real IANA zone", () => {
    const zoned = appearanceTimeZoneSchema.parse("Europe/Berlin");
    expect(zoned).toBe("Europe/Berlin");
  });

  it("enum schemas reject invalid literals", () => {
    expect(appearanceThemeSchema.safeParse("invalid").success).toBe(false);
    expect(appearanceLocaleSchema.safeParse("fr").success).toBe(false);
    expect(appearanceColorSchemeSchema.safeParse("no-such-scheme").success).toBe(false);
  });
});
