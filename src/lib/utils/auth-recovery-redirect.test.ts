import { describe, expect, it } from "vitest";
import { originFromForwardedHeaders } from "./auth-recovery-redirect";

describe("originFromForwardedHeaders", () => {
  it("prefers x-forwarded-host over host", () => {
    expect(
      originFromForwardedHeaders(
        "crm.aquadock.de",
        "internal:3000",
        "https",
      ),
    ).toBe("https://crm.aquadock.de");
  });

  it("uses first comma-separated forwarded host", () => {
    expect(
      originFromForwardedHeaders(
        "crm.aquadock.de, 10.0.0.1",
        null,
        "https",
      ),
    ).toBe("https://crm.aquadock.de");
  });

  it("falls back to host when forwarded host missing", () => {
    expect(originFromForwardedHeaders(null, "localhost:3000", "http")).toBe(
      "http://localhost:3000",
    );
  });

  it("defaults proto to https when missing or unknown", () => {
    expect(originFromForwardedHeaders("app.example.com", null, null)).toBe(
      "https://app.example.com",
    );
  });

  it("returns null when no host", () => {
    expect(originFromForwardedHeaders(null, null, "https")).toBeNull();
  });
});
