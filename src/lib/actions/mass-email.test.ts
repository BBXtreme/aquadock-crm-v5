import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ rejected: [], response: "250 ok" }),
    })),
  },
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

const getSmtpConfig = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/smtp", () => ({
  getSmtpConfig,
}));

const getMassEmailRecipients = vi.hoisted(() => vi.fn());
const createEmailLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/email", () => ({
  getMassEmailRecipients,
  createEmailLog,
  fillPlaceholders: (subject: string) => subject,
}));

function clientWithUser(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId != null ? { id: userId } : null },
      }),
    },
  };
}

describe("sendMassEmailAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerSupabaseClient.mockResolvedValue(clientWithUser(null) as never);
  });

  it("throws when unauthenticated", async () => {
    const { sendMassEmailAction } = await import("@/lib/actions/mass-email");
    await expect(
      sendMassEmailAction({
        mode: "contacts",
        subject: "Hello",
        body: "<p>x</p>",
        contact_ids: [],
      }),
    ).rejects.toThrow("Nicht authentifiziert");
  });

  it("throws when SMTP is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(clientWithUser("user-1") as never);
    getSmtpConfig.mockResolvedValue(null);
    const { sendMassEmailAction } = await import("@/lib/actions/mass-email");
    await expect(
      sendMassEmailAction({
        mode: "contacts",
        subject: "Hello",
        body: "<p>x</p>",
        contact_ids: ["c1"],
      }),
    ).rejects.toThrow("SMTP-Konfiguration fehlt");
  });

  it("throws on invalid test email format before sending", async () => {
    createServerSupabaseClient.mockResolvedValue(clientWithUser("user-1") as never);
    getSmtpConfig.mockResolvedValue({
      host: "smtp.example.com",
      port: 587,
      user: "u",
      password: "p",
    });
    const { sendMassEmailAction } = await import("@/lib/actions/mass-email");
    await expect(
      sendMassEmailAction({
        mode: "contacts",
        subject: "Hello",
        body: "<p>x</p>",
        testEmail: "not-an-email",
      }),
    ).rejects.toThrow("Ungültiges E-Mail-Format");
  });

  it("throws when no matching recipients after selection", async () => {
    createServerSupabaseClient.mockResolvedValue(clientWithUser("user-1") as never);
    getSmtpConfig.mockResolvedValue({
      host: "smtp.example.com",
      port: 587,
      user: "u",
      password: "p",
    });
    getMassEmailRecipients.mockResolvedValue([]);
    const { sendMassEmailAction } = await import("@/lib/actions/mass-email");
    await expect(
      sendMassEmailAction({
        mode: "contacts",
        subject: "Hello",
        body: "<p>x</p>",
        contact_ids: ["missing-id"],
      }),
    ).rejects.toThrow("Keine Empfänger ausgewählt");
  });
});
