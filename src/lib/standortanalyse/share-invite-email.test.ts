import { describe, expect, it } from "vitest";

import {
  buildStandortanalyseInviteEmailContent,
  isPlaceholderInviteEmail,
} from "@/lib/standortanalyse/share-invite-email";

describe("isPlaceholderInviteEmail", () => {
  it("treats draft and pending placeholder domains as invalid", () => {
    expect(isPlaceholderInviteEmail("draft-123@aquadock.invalid")).toBe(true);
    expect(isPlaceholderInviteEmail("pending-123@aquadock.invalid")).toBe(true);
    expect(isPlaceholderInviteEmail("")).toBe(true);
  });

  it("accepts real customer emails", () => {
    expect(isPlaceholderInviteEmail("kunde@beispiel.de")).toBe(false);
  });
});

describe("buildStandortanalyseInviteEmailContent", () => {
  it("includes share url, expiry and password hint", () => {
    const content = buildStandortanalyseInviteEmailContent({
      shareUrl: "https://crm.example/standortanalyse/share/abc",
      expiresAt: "2099-01-01T12:00:00.000Z",
      passwordProtected: true,
      recipientName: "Max Mustermann",
    });

    expect(content.subject).toContain("Einladung");
    expect(content.html).toContain("https://crm.example/standortanalyse/share/abc");
    expect(content.html).toContain("passwortgeschützt");
    expect(content.text).toContain("Max Mustermann");
  });
});
