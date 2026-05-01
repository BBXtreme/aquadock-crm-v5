/**
 * Integration tests for {@link ./ContactCreateForm.tsx}: `useForm` + `zodResolver(contactSchema)` and mapping aligned with `toContactInsert`.
 *
 * Mocks: per-file `@/lib/supabase/browser` for companies query, `createContactAction`, `sonner`. `next/navigation` is mocked in {@link ../../../test/setup.ts}.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContactAction } from "@/lib/actions/contacts";
import { type ContactForm, contactSchema, toContactInsert } from "@/lib/validations/contact";
import enMessages from "@/messages/en.json";
import type { Contact } from "@/types/database.types";
import ContactCreateForm from "./ContactCreateForm";

vi.mock("@/lib/actions/contacts", () => ({
  createContactAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { mockCreateClient, COMPANY_ID } = vi.hoisted(() => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const companiesRow = [{ id, firmenname: "Fixture GmbH" }];
  const mockCreateClient = vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "companies") {
        return {
          select: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: companiesRow,
                  error: null,
                }),
              ),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          is: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      };
    }),
  }));
  return { mockCreateClient, COMPANY_ID: id };
});

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => mockCreateClient(),
}));

const mockedCreateContactAction = vi.mocked(createContactAction);

function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderContactForm(ui: ReactElement) {
  const QueryWrapper = createQueryWrapper();
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <QueryWrapper>{ui}</QueryWrapper>
    </NextIntlClientProvider>,
  );
}

function withinContactForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) {
    throw new Error("Expected ContactCreateForm to render a <form> element");
  }
  return within(form);
}

async function selectCompanyByName(user: ReturnType<typeof userEvent.setup>, companyLabel: string) {
  await user.click(screen.getByRole("button", { name: /Select company/i }));
  await screen.findByPlaceholderText(/Search companies/i);
  await user.click(screen.getByRole("option", { name: companyLabel }));
}

async function waitForCompanyComboboxReady(view: ReturnType<typeof within>) {
  await waitFor(() => {
    expect(view.getByRole("button", { name: /Select company/i })).toBeInTheDocument();
  });
}
afterEach(() => {
  cleanup();
});

describe("ContactCreateForm + contactSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const createdRow: Contact = {
      id: "22222222-2222-2222-2222-222222222222",
      vorname: "Max",
      nachname: "Mustermann",
      anrede: null,
      position: null,
      email: null,
      telefon: null,
      mobil: null,
      durchwahl: null,
      notes: null,
      company_id: COMPANY_ID,
      is_primary: false,
      user_id: null,
      created_at: null,
      updated_at: null,
      created_by: null,
      updated_by: null,
      search_vector: null,
      deleted_at: null,
      deleted_by: null,
    };
    mockedCreateContactAction.mockResolvedValue(createdRow);
  });

  it("renders core field labels and Create contact submit", () => {
    const { container } = renderContactForm(<ContactCreateForm />);
    const view = withinContactForm(container);
    expect(view.getByText("First name")).toBeInTheDocument();
    expect(view.getByText("Last name")).toBeInTheDocument();
    expect(view.getByRole("button", { name: /Create contact/i })).toBeInTheDocument();
  });

  it("submits valid data and calls createContactAction with values compatible with toContactInsert", async () => {
    const user = userEvent.setup();
    const { container } = renderContactForm(<ContactCreateForm />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected ContactCreateForm to render a <form> element");
    }
    const view = within(form);

    await waitFor(() => {
      expect(form.querySelectorAll("select[aria-hidden=\"true\"]").length).toBeGreaterThan(0);
    });
    await waitForCompanyComboboxReady(view);

    await user.type(view.getByRole("textbox", { name: /First name/i }), "Erika");
    await user.type(view.getByRole("textbox", { name: /Last name/i }), "Musterfrau");

    await selectCompanyByName(user, "Fixture GmbH");

    await user.click(view.getByRole("button", { name: /Create contact/i }));

    await waitFor(() => {
      expect(mockedCreateContactAction).toHaveBeenCalledTimes(1);
    });

    const firstCall = mockedCreateContactAction.mock.calls[0];
    if (firstCall === undefined) {
      throw new Error("expected createContactAction to have been called");
    }
    const submitted = firstCall[0] as ContactForm;

    const parsed = contactSchema.parse({
      vorname: submitted.vorname,
      nachname: submitted.nachname,
      anrede: submitted.anrede,
      position: submitted.position,
      email: submitted.email,
      telefon: submitted.telefon,
      mobil: submitted.mobil,
      durchwahl: submitted.durchwahl,
      notes: submitted.notes,
      company_id: submitted.company_id,
      is_primary: submitted.is_primary,
    });
    const insert = toContactInsert(parsed);

    expect(insert.vorname).toBe("Erika");
    expect(insert.nachname).toBe("Musterfrau");
    expect(insert.company_id).toBe(COMPANY_ID);
    expect(insert.email).toBeNull();
  });

  it("blocks submit when First name is empty", async () => {
    const user = userEvent.setup();
    const { container } = renderContactForm(<ContactCreateForm />);
    const view = withinContactForm(container);

    await user.type(view.getByRole("textbox", { name: /Last name/i }), "OnlyLast");
    await user.click(view.getByRole("button", { name: /Create contact/i }));

    await waitFor(() => {
      expect(view.getByText("Vorname ist erforderlich")).toBeInTheDocument();
    });
    expect(mockedCreateContactAction).not.toHaveBeenCalled();
  });

  it("blocks submit when Last name is empty", async () => {
    const user = userEvent.setup();
    const { container } = renderContactForm(<ContactCreateForm />);
    const view = withinContactForm(container);

    await user.type(view.getByRole("textbox", { name: /First name/i }), "OnlyFirst");
    await user.click(view.getByRole("button", { name: /Create contact/i }));

    await waitFor(() => {
      expect(view.getByText("Nachname ist erforderlich")).toBeInTheDocument();
    });
    expect(mockedCreateContactAction).not.toHaveBeenCalled();
  });

  it("blocks submit when Email is present but invalid", async () => {
    const user = userEvent.setup();
    const { container } = renderContactForm(<ContactCreateForm />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected ContactCreateForm to render a <form> element");
    }
    const view = within(form);

    await waitFor(() => {
      expect(form.querySelectorAll("select[aria-hidden=\"true\"]").length).toBeGreaterThan(0);
    });
    await waitForCompanyComboboxReady(view);

    await user.type(view.getByRole("textbox", { name: /First name/i }), "Valid");
    await user.type(view.getByRole("textbox", { name: /Last name/i }), "Person");
    await user.type(view.getByRole("textbox", { name: /Email/i }), "not-an-email");

    await selectCompanyByName(user, "Fixture GmbH");

    form.noValidate = true;
    await user.click(view.getByRole("button", { name: /Create contact/i }));

    await waitFor(() => {
      expect(view.getByText("Ungültige E-Mail-Adresse")).toBeInTheDocument();
    });
    expect(mockedCreateContactAction).not.toHaveBeenCalled();
  });

  it("maps optional empty position to nullish insert output when omitted from submit payload", async () => {
    const user = userEvent.setup();
    const { container } = renderContactForm(<ContactCreateForm />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected ContactCreateForm to render a <form> element");
    }
    const view = within(form);

    await waitFor(() => {
      expect(form.querySelectorAll("select[aria-hidden=\"true\"]").length).toBeGreaterThan(0);
    });
    await waitForCompanyComboboxReady(view);

    await user.type(view.getByRole("textbox", { name: /First name/i }), "Pos");
    await user.type(view.getByRole("textbox", { name: /Last name/i }), "Empty");

    await selectCompanyByName(user, "Fixture GmbH");

    await user.click(view.getByRole("button", { name: /Create contact/i }));

    await waitFor(() => {
      expect(mockedCreateContactAction).toHaveBeenCalledTimes(1);
    });

    const firstCall = mockedCreateContactAction.mock.calls[0];
    if (firstCall === undefined) {
      throw new Error("expected createContactAction to have been called");
    }
    const raw = firstCall[0] as ContactForm;
    const parsed = contactSchema.parse({
      vorname: raw.vorname,
      nachname: raw.nachname,
      anrede: raw.anrede,
      position: raw.position,
      email: raw.email,
      telefon: raw.telefon,
      mobil: raw.mobil,
      durchwahl: raw.durchwahl,
      notes: raw.notes,
      company_id: raw.company_id,
      is_primary: raw.is_primary,
    });
    expect(toContactInsert(parsed).position).toBeNull();
  });
});

describe("contactSchema contract (strict, enums, company_id, empty strings)", () => {
  const minimal = {
    vorname: "A",
    nachname: "B",
  };

  it("rejects unknown keys under .strict()", () => {
    const raw = { ...minimal, legacy_id: "x" };
    const result = contactSchema.safeParse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === "unrecognized_keys")).toBe(true);
    }
  });

  it("rejects invalid anrede enum", () => {
    const result = contactSchema.safeParse({ ...minimal, anrede: "Sir" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid company_id UUID", () => {
    const result = contactSchema.safeParse({ ...minimal, company_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("maps omitted company_id to null in toContactInsert", () => {
    const parsed = contactSchema.parse(minimal);
    expect(parsed.company_id).toBeUndefined();
    expect(toContactInsert(parsed).company_id).toBeNull();
  });

  it("maps omitted email to null in toContactInsert", () => {
    const parsed = contactSchema.parse(minimal);
    expect(parsed.email).toBeUndefined();
    expect(toContactInsert(parsed).email).toBeNull();
  });

  it("maps company_id empty string to null before uuid validation", () => {
    const result = contactSchema.safeParse({ ...minimal, company_id: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company_id).toBeNull();
      expect(toContactInsert(result.data).company_id).toBeNull();
    }
  });

  it("maps email empty string to null before email validation", () => {
    const result = contactSchema.safeParse({ ...minimal, email: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(toContactInsert(result.data).email).toBeNull();
    }
  });
});
