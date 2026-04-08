/**
 * Integration tests for {@link ./CompanyCreateForm.tsx}: `useForm` + `zodResolver(companySchema)` (Zod single source of truth; there is no separate `companyFormSchema`).
 *
 * Mocks: `next/navigation` and `@/lib/supabase/browser` in {@link ../../../test/setup.ts}. This file also mocks `createCompany` and `sonner` so submit flows stay offline and deterministic.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { createCompany } from "@/lib/actions/companies";
import { companySchema, toCompanyInsert } from "@/lib/validations/company";
import type { Company } from "@/types/database.types";
import CompanyCreateForm from "./CompanyCreateForm";

vi.mock("@/lib/actions/companies", () => ({
  createCompany: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedCreateCompany = vi.mocked(createCompany);

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

function renderCompanyForm(ui: ReactElement) {
  const Wrapper = createQueryWrapper();
  return render(ui, { wrapper: Wrapper });
}

function withinCompanyForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) {
    throw new Error("Expected CompanyCreateForm to render a <form> element");
  }
  return within(form);
}

function mockCompanyRow(overrides: Partial<Company> = {}): Company {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    firmenname: "Fixture GmbH",
    kundentyp: "sonstige",
    status: "lead",
    rechtsform: null,
    firmentyp: null,
    website: null,
    telefon: null,
    email: null,
    strasse: null,
    plz: null,
    stadt: null,
    bundesland: null,
    land: "Deutschland",
    wasserdistanz: null,
    wassertyp: null,
    lat: null,
    lon: null,
    osm: null,
    value: null,
    notes: null,
    user_id: null,
    created_at: null,
    updated_at: null,
    created_by: null,
    updated_by: null,
    import_batch: null,
    search_vector: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

describe("CompanyCreateForm + companySchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateCompany.mockResolvedValue(mockCompanyRow());
  });

  it("renders core field labels and a submit button", () => {
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);
    expect(view.getByText("Firmenname")).toBeInTheDocument();
    expect(view.getByText("Kundentyp")).toBeInTheDocument();
    expect(view.getByText("Status")).toBeInTheDocument();
    expect(view.getByText("Strasse")).toBeInTheDocument();
    expect(view.getByRole("button", { name: /Speichern/i })).toBeInTheDocument();
  });

  it("submits valid data and calls createCompany with values compatible with toCompanyInsert", async () => {
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);

    await user.type(view.getByRole("textbox", { name: /Firmenname/i }), "Nordsee Marina AG");
    await user.type(view.getByRole("textbox", { name: /Strasse/i }), "Am Hafen 1");
    await user.type(view.getByRole("textbox", { name: /^Plz$/i }), "27498");
    await user.type(view.getByRole("textbox", { name: /Stadt/i }), "Helgoland");

    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(mockedCreateCompany).toHaveBeenCalledTimes(1);
    });

    const firstCall = mockedCreateCompany.mock.calls[0];
    if (firstCall === undefined) {
      throw new Error("expected createCompany to have been called");
    }
    const submitted = firstCall[0];
    const parsed = companySchema.parse(submitted);
    const insert = toCompanyInsert(parsed);

    expect(insert.firmenname).toBe("Nordsee Marina AG");
    expect(insert.strasse).toBe("Am Hafen 1");
    expect(insert.plz).toBe("27498");
    expect(insert.stadt).toBe("Helgoland");
    expect(insert.kundentyp).toBe("sonstige");
    expect(insert.status).toBe("lead");
    expect(insert.land).toBe("Deutschland");
    expect(insert.website).toBeNull();
    expect(insert.email).toBeNull();
  });

  it("blocks submit when Firmenname is empty and shows validation message", async () => {
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);

    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(view.getByText("Firmenname ist erforderlich")).toBeInTheDocument();
    });
    expect(mockedCreateCompany).not.toHaveBeenCalled();
  });

  it("blocks submit when Firmenname is only whitespace after trim", async () => {
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);

    await user.type(view.getByRole("textbox", { name: /Firmenname/i }), "   ");
    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(view.getByText("Firmenname ist erforderlich")).toBeInTheDocument();
    });
    expect(mockedCreateCompany).not.toHaveBeenCalled();
  });

  it("submits after user changes Kundentyp and Status via native select (Radix hidden selects)", async () => {
    // Radix Select triggers pointer-capture APIs missing in jsdom; `user.selectOptions` on the hidden <select> matches real option values.
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected CompanyCreateForm to render a <form> element");
    }
    const view = within(form);

    await user.type(view.getByRole("textbox", { name: /Firmenname/i }), "Harbor Hotel GmbH");

    const hiddenSelects = form.querySelectorAll("select[aria-hidden=\"true\"]");
    const kundentypSelect = hiddenSelects[0];
    const statusSelect = hiddenSelects[4];
    if (!(kundentypSelect instanceof HTMLSelectElement)) {
      throw new Error("expected Radix hidden select for Kundentyp");
    }
    if (!(statusSelect instanceof HTMLSelectElement)) {
      throw new Error("expected Radix hidden select for Status");
    }

    await user.selectOptions(kundentypSelect, "hotel");
    await user.selectOptions(statusSelect, "kunde");

    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(mockedCreateCompany).toHaveBeenCalledTimes(1);
    });

    const firstCall = mockedCreateCompany.mock.calls[0];
    if (firstCall === undefined) {
      throw new Error("expected createCompany to have been called");
    }
    const insert = toCompanyInsert(companySchema.parse(firstCall[0]));
    expect(insert.firmenname).toBe("Harbor Hotel GmbH");
    expect(insert.kundentyp).toBe("hotel");
    expect(insert.status).toBe("kunde");
  });

  it("blocks submit when Website is present but not a valid URL", async () => {
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);

    await user.type(view.getByRole("textbox", { name: /Firmenname/i }), "Valid Name GmbH");
    await user.type(view.getByRole("textbox", { name: /Website/i }), "not-a-valid-url");

    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(view.getByText("Ungültige URL")).toBeInTheDocument();
    });
    expect(mockedCreateCompany).not.toHaveBeenCalled();
  });

  it("blocks submit when Osm is present but does not match node|way|relation schema", async () => {
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);

    await user.type(view.getByRole("textbox", { name: /Firmenname/i }), "Valid Name GmbH");
    await user.type(view.getByRole("textbox", { name: /^Osm$/i }), "bad-osm");

    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(view.getByText("Ungültiges OSM Format")).toBeInTheDocument();
    });
    expect(mockedCreateCompany).not.toHaveBeenCalled();
  });

  it("blocks submit when latitude is out of range", async () => {
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);

    await user.type(view.getByRole("textbox", { name: /Firmenname/i }), "Geo Test GmbH");
    const lat = view.getByRole("spinbutton", { name: /Lat/i });
    await user.clear(lat);
    await user.type(lat, "91");

    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(view.getByText("Latitude muss zwischen -90 und 90 liegen")).toBeInTheDocument();
    });
    expect(mockedCreateCompany).not.toHaveBeenCalled();
  });

  it("blocks submit when longitude is out of range", async () => {
    const user = userEvent.setup();
    const { container } = renderCompanyForm(<CompanyCreateForm />);
    const view = withinCompanyForm(container);

    await user.type(view.getByRole("textbox", { name: /Firmenname/i }), "Geo Test GmbH");
    const lon = view.getByRole("spinbutton", { name: /^Lon$/i });
    await user.clear(lon);
    await user.type(lon, "200");

    await user.click(view.getByRole("button", { name: /Speichern/i }));

    await waitFor(() => {
      expect(view.getByText("Longitude muss zwischen -180 und 180 liegen")).toBeInTheDocument();
    });
    expect(mockedCreateCompany).not.toHaveBeenCalled();
  });
});

describe("companySchema contract (strict, enums, nullable mapping)", () => {
  const minimal = {
    firmenname: "Schema GmbH",
    kundentyp: "marina" as const,
    status: "lead" as const,
  };

  it("rejects unknown keys under .strict()", () => {
    const raw = { ...minimal, legacy_import_id: "x" };
    const result = companySchema.safeParse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === "unrecognized_keys")).toBe(true);
    }
  });

  it("rejects invalid kundentyp enum", () => {
    const result = companySchema.safeParse({ ...minimal, kundentyp: "invalid_kundentyp" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status enum", () => {
    const result = companySchema.safeParse({ ...minimal, status: "unknown_status" });
    expect(result.success).toBe(false);
  });

  it("coerces empty string lat/lon to null via preprocess", () => {
    const raw = {
      firmenname: "Preprocess GmbH",
      kundentyp: "hotel",
      status: "kunde",
      lat: "",
      lon: "",
    };
    const parsed = companySchema.parse(raw as z.input<typeof companySchema>);
    expect(parsed.lat).toBeNull();
    expect(parsed.lon).toBeNull();
    expect(toCompanyInsert(parsed).lat).toBeNull();
    expect(toCompanyInsert(parsed).lon).toBeNull();
  });

  it("maps omitted website and email to null in toCompanyInsert (optional fields untouched in UI)", () => {
    const values = companySchema.parse({
      firmenname: "Parse Only GmbH",
      kundentyp: "marina",
      status: "interessant",
    });
    const insert = toCompanyInsert(values);
    expect(insert.website).toBeNull();
    expect(insert.email).toBeNull();
  });

  it("maps explicit null website and email through parse and toCompanyInsert", () => {
    const values = companySchema.parse({
      ...minimal,
      website: null,
      email: null,
    });
    expect(toCompanyInsert(values).website).toBeNull();
    expect(toCompanyInsert(values).email).toBeNull();
  });
});
