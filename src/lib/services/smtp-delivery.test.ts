import nodemailer from "nodemailer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemSmtpConfigForNotifications, sendNotificationHtmlEmail } from "./smtp-delivery";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const actingId = "10000000-0000-4000-8000-000000000001";
const adminId = "10000000-0000-4000-8000-000000000099";

const usableJson = JSON.stringify({
  host: "smtp.example.com",
  port: 587,
  user: "u@example.com",
  password: "secret",
  fromName: "CRM",
});

function chainUserSettings(
  maybeResult: { data: unknown; error: unknown },
  emptyProfiles = true,
) {
  return {
    from: vi.fn((table: string) => {
      if (table === "user_settings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue(maybeResult),
              }),
            }),
          }),
        };
      }
      if (table === "profiles" && emptyProfiles) {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return { select: () => ({}) };
    }),
  };
}

function chainProfiles(
  listResult: { data: unknown; error: unknown },
  userSettingsResultsByUserId: Record<string, { data: unknown; error: unknown }>,
) {
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => Promise.resolve(listResult),
          }),
        };
      }
      if (table === "user_settings") {
        return {
          select: () => ({
            eq: (_field: string, userId: string) => ({
              eq: () => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue(
                    userSettingsResultsByUserId[userId] ?? { data: null, error: null },
                  ),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  };
}

describe("getSystemSmtpConfigForNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns acting user SMTP when present", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      chainUserSettings({
        data: { value: usableJson },
        error: null,
      }) as never,
    );
    const cfg = await getSystemSmtpConfigForNotifications(actingId);
    expect(cfg).toEqual({
      host: "smtp.example.com",
      port: 587,
      user: "u@example.com",
      password: "secret",
      fromName: "CRM",
    });
  });

  it("returns null when user_settings row has non-string value and no admin smtp", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(createAdminClient).mockReturnValue(
      chainUserSettings(
        {
          data: { value: true },
          error: null,
        },
        true,
      ) as never,
    );
    const cfg = await getSystemSmtpConfigForNotifications(actingId);
    expect(cfg).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("falls back to first admin with SMTP when acting user has none", async () => {
    const adminValue = JSON.stringify({
      host: "fallback.example.com",
      port: 465,
      user: "a@x.com",
      password: "x",
    });
    vi.mocked(createAdminClient).mockReturnValue(
      chainProfiles(
        { data: [{ id: adminId }], error: null },
        {
          [actingId]: { data: null, error: null },
          [adminId]: { data: { value: adminValue }, error: null },
        },
      ) as never,
    );
    const cfg = await getSystemSmtpConfigForNotifications(actingId);
    expect(cfg?.host).toBe("fallback.example.com");
  });
});

describe("getSystemSmtpConfigForNotifications fallback to admin", () => {
  it("uses first admin row when primary load returns null", async () => {
    const smtp = {
      host: "a.example.com",
      port: "587",
      user: "admin@x.com",
      password: "p",
    };
    vi.mocked(createAdminClient).mockReturnValue(
      chainProfiles(
        { data: [{ id: adminId }], error: null },
        {
          [actingId]: { data: { value: "not-json" }, error: null },
          [adminId]: { data: { value: JSON.stringify(smtp) }, error: null },
        },
      ) as never,
    );
    const cfg = await getSystemSmtpConfigForNotifications(actingId);
    expect(cfg).toMatchObject({ host: "a.example.com", user: "admin@x.com" });
  });

  it("returns null and warns when no admin profiles", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(createAdminClient).mockReturnValue(
      chainProfiles({ data: [], error: null }, {}) as never,
    );
    expect(await getSystemSmtpConfigForNotifications(actingId)).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no admin profiles found"),
    );
    warn.mockRestore();
  });

  it("returns null when profile list errors", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      chainProfiles({ data: null, error: { message: "e" } }, {}) as never,
    );
    expect(await getSystemSmtpConfigForNotifications(actingId)).toBeNull();
  });

  it("returns null when no admin has smtp_config", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(createAdminClient).mockReturnValue(
      chainProfiles(
        { data: [{ id: adminId }], error: null },
        {
          [actingId]: { data: null, error: null },
          [adminId]: { data: { value: "{}" }, error: null },
        },
      ) as never,
    );
    expect(await getSystemSmtpConfigForNotifications(actingId)).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no admin has smtp_config"),
    );
    warn.mockRestore();
  });

  it("user_settings error in loadForUser returns null for that user only", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      chainProfiles(
        { data: [{ id: adminId }], error: null },
        {
          [actingId]: { data: null, error: { message: "db" } },
          [adminId]: { data: { value: usableJson }, error: null },
        },
      ) as never,
    );
    const cfg = await getSystemSmtpConfigForNotifications(actingId);
    expect(cfg?.host).toBe("smtp.example.com");
  });
});

describe("sendNotificationHtmlEmail", () => {
  const sendMail = vi.fn().mockResolvedValue(undefined);
  const createTransport = vi.spyOn(nodemailer, "createTransport").mockReturnValue({
    sendMail,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it("no-ops when to is empty", async () => {
    await sendNotificationHtmlEmail({ to: [], subject: "S", html: "<p>x</p>" });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("no-ops when no SMTP config", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      chainProfiles({ data: [], error: null }, {}) as never,
    );
    await sendNotificationHtmlEmail({
      to: ["a@b.com"],
      subject: "S",
      html: "<p>x</p>",
    });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("sends html without text when text omitted", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      chainUserSettings({ data: { value: usableJson }, error: null }) as never,
    );
    await sendNotificationHtmlEmail({
      to: ["dest@b.com"],
      subject: "Subj",
      html: "<p>h</p>",
      actingAdminUserId: actingId,
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "dest@b.com",
        subject: "Subj",
        html: "<p>h</p>",
      }),
    );
    const firstSend = sendMail.mock.calls[0];
    if (firstSend === undefined) {
      throw new Error("expected sendMail to have been called");
    }
    const arg = firstSend[0] as { text?: string };
    expect(arg.text).toBeUndefined();
  });

  it("includes text when provided", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      chainUserSettings({ data: { value: usableJson }, error: null }) as never,
    );
    await sendNotificationHtmlEmail({
      actingAdminUserId: actingId,
      to: ["d@b.com"],
      subject: "S",
      html: "<p>h</p>",
      text: "plain",
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ text: "plain" }),
    );
  });

  it("omits text when empty string", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      chainUserSettings({ data: { value: usableJson }, error: null }) as never,
    );
    await sendNotificationHtmlEmail({
      actingAdminUserId: actingId,
      to: ["d@b.com"],
      subject: "S",
      html: "<p>h</p>",
      text: "",
    });
    const first = sendMail.mock.calls[0];
    if (first === undefined) {
      throw new Error("expected sendMail to have been called");
    }
    const arg = first[0] as { text?: string };
    expect(arg.text).toBeUndefined();
  });

  it("uses secure transport when port is 465", async () => {
    const json465 = JSON.stringify({
      host: "s",
      port: 465,
      user: "u@u.com",
      password: "p",
    });
    vi.mocked(createAdminClient).mockReturnValue(
      chainUserSettings({ data: { value: json465 }, error: null }) as never,
    );
    await sendNotificationHtmlEmail({
      actingAdminUserId: actingId,
      to: ["x@y.com"],
      subject: "S",
      html: "<p>a</p>",
    });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
  });
});
