import { describe, expect, it } from "vitest";
import {
  adminChangeUserRoleSchema,
  adminCreateUserSchema,
  adminDeleteUserSchema,
  adminUpdateUserDisplayNameSchema,
  allowedAvatarMimeTypes,
  changeEmailSchema,
  changePasswordSchema,
  PROFILE_AVATAR_MAX_BYTES,
  parseProfileAvatarFile,
  passwordRecoverySetSchema,
  profileAvatarSchema,
  profileDisplayNameSchema,
  resolveProfileAvatarMime,
} from "./profile";

const sampleUuid = "10000000-0000-4000-8000-000000000001";

describe("resolveProfileAvatarMime", () => {
  it("prefers file.type when allowed", () => {
    const f = new File([], "x.png", { type: "image/png" });
    expect(resolveProfileAvatarMime(f)).toBe("image/png");
  });

  it("infers from filename when type missing", () => {
    const f = new File([], "a.jpeg", { type: "" });
    expect(resolveProfileAvatarMime(f)).toBe("image/jpeg");
  });

  it("defaults to image/jpeg when unknown extension", () => {
    const f = new File([], "a.bin", { type: "" });
    expect(resolveProfileAvatarMime(f)).toBe("image/jpeg");
  });

  it("infers webp and gif from filename when type is empty", () => {
    expect(resolveProfileAvatarMime(new File([], "p.webp", { type: "" }))).toBe("image/webp");
    expect(resolveProfileAvatarMime(new File([], "a.GIF", { type: "" }))).toBe("image/gif");
  });

  it("infers mime from filename when type is present but not an allowed image type", () => {
    const f = new File([], "logo.png", { type: "application/octet-stream" });
    expect(resolveProfileAvatarMime(f)).toBe("image/png");
  });
});

describe("allowedAvatarMimeTypes", () => {
  it("contains expected mimes", () => {
    expect(allowedAvatarMimeTypes.has("image/png")).toBe(true);
  });
});

describe("profileAvatarSchema", () => {
  it("accepts null or url", () => {
    expect(profileAvatarSchema.parse({ avatar_url: null })).toEqual({ avatar_url: null });
    expect(profileAvatarSchema.parse({ avatar_url: "https://x.example/a.png" })).toEqual({
      avatar_url: "https://x.example/a.png",
    });
  });

  it("rejects invalid url", () => {
    expect(() => profileAvatarSchema.parse({ avatar_url: "not-a-url" })).toThrow();
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching passwords", () => {
    const out = changePasswordSchema.parse({
      new_password: "abcdefgh",
      confirm_password: "abcdefgh",
    });
    expect(out.new_password).toBe("abcdefgh");
  });

  it("rejects mismatch", () => {
    expect(() =>
      changePasswordSchema.parse({
        new_password: "abcdefgh",
        confirm_password: "abcdefgi",
      }),
    ).toThrow();
  });
});

describe("passwordRecoverySetSchema", () => {
  it("accepts matching password fields", () => {
    expect(() =>
      passwordRecoverySetSchema.parse({
        password: "12345678",
        confirm_password: "12345678",
      }),
    ).not.toThrow();
  });

  it("rejects short password", () => {
    expect(() =>
      passwordRecoverySetSchema.parse({
        password: "short",
        confirm_password: "short",
      }),
    ).toThrow();
  });
});

describe("changeEmailSchema", () => {
  it("accepts valid email", () => {
    expect(changeEmailSchema.parse({ new_email: "a@b.co" }).new_email).toBe("a@b.co");
  });

  it("rejects invalid", () => {
    expect(() => changeEmailSchema.parse({ new_email: "bad" })).toThrow();
  });
});

describe("profileDisplayNameSchema", () => {
  it("trims and validates length", () => {
    expect(profileDisplayNameSchema.parse({ display_name: "  Max  " }).display_name).toBe("Max");
  });

  it("rejects empty", () => {
    expect(() => profileDisplayNameSchema.parse({ display_name: "   " })).toThrow();
  });
});

describe("adminUpdateUserDisplayNameSchema", () => {
  it("accepts uuid and display name", () => {
    const r = adminUpdateUserDisplayNameSchema.parse({
      userId: sampleUuid,
      display_name: "  Admin  ",
    });
    expect(r.userId).toBe(sampleUuid);
    expect(r.display_name).toBe("Admin");
  });

  it("rejects bad uuid", () => {
    expect(() =>
      adminUpdateUserDisplayNameSchema.parse({ userId: "nope", display_name: "A" }),
    ).toThrow();
  });
});

describe("adminChangeUserRoleSchema", () => {
  it("accepts user and admin role", () => {
    expect(
      adminChangeUserRoleSchema.parse({ userId: sampleUuid, newRole: "admin" }).newRole,
    ).toBe("admin");
  });

  it("rejects invalid role", () => {
    const raw: { userId: string; newRole: string } = { userId: sampleUuid, newRole: "nope" };
    expect(() => adminChangeUserRoleSchema.parse(raw)).toThrow();
  });
});

describe("adminDeleteUserSchema", () => {
  it("accepts uuid", () => {
    expect(adminDeleteUserSchema.parse({ userId: sampleUuid }).userId).toBe(sampleUuid);
  });
});

describe("adminCreateUserSchema", () => {
  it("maps empty display_name to null and defaults missing role to user", () => {
    const r = adminCreateUserSchema.parse({
      email: "new@example.com",
      display_name: "   ",
      role: "",
    });
    expect(r.display_name).toBeNull();
    expect(r.role).toBe("user");
  });

  it("keeps non-empty display name and explicit admin role", () => {
    const r = adminCreateUserSchema.parse({
      email: "b@example.com",
      display_name: "  Bernd  ",
      role: "admin",
    });
    expect(r.display_name).toBe("Bernd");
    expect(r.role).toBe("admin");
  });

  it("rejects bad email", () => {
    expect(() =>
      adminCreateUserSchema.parse({ email: "bad", display_name: "", role: "user" }),
    ).toThrow();
  });
});

describe("parseProfileAvatarFile", () => {
  it("parses valid small png", () => {
    const buf = new Uint8Array(10);
    const f = new File([buf], "a.png", { type: "image/png" });
    expect(() => parseProfileAvatarFile(f)).not.toThrow();
  });

  it("rejects oversized file", () => {
    const big = new Uint8Array(PROFILE_AVATAR_MAX_BYTES + 1);
    const f = new File([big], "huge.png", { type: "image/png" });
    expect(() => parseProfileAvatarFile(f)).toThrow();
  });

  it("rejects bad mime", () => {
    const f = new File([new Uint8Array(5)], "x.txt", { type: "text/plain" });
    expect(() => parseProfileAvatarFile(f)).toThrow();
  });

  it("accepts small png when browser omits file.type but extension is png", () => {
    const buf = new Uint8Array(10);
    const f = new File([buf], "avatar.png", { type: "" });
    expect(() => parseProfileAvatarFile(f)).not.toThrow();
  });
});
