/**
 * Regression: company detail cards must reflect inline edits without a full document reload.
 * Simulates RSC re-fetch by merging the last `updateCompany` payload when `router.refresh()` runs.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
import { Suspense, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompanyDetailClient from "@/components/features/companies/CompanyDetailClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { updateCompany, updateCompanyWithOwner } from "@/lib/actions/companies";
import type { UpdateCompanyWithOwnerInput } from "@/lib/validations/company-owner";
import deMessages from "@/messages/de.json";
import type { Company } from "@/types/database.types";

const testCtx = vi.hoisted(() => {
  const lastPartial: { current: Partial<Company> } = { current: {} };
  let setCompanyRef: Dispatch<SetStateAction<Company>> | null = null;

  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(() => {
      if (setCompanyRef) {
        setCompanyRef((c) => ({ ...c, ...lastPartial.current }));
      }
    }),
  };

  return {
    lastPartial,
    mockRouter,
    registerSetCompany: (fn: Dispatch<SetStateAction<Company>>) => {
      setCompanyRef = fn;
    },
    unregisterSetCompany: () => {
      setCompanyRef = null;
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => testCtx.mockRouter,
  usePathname: () => "/companies/550e8400-e29b-41d4-a716-446655440000",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "550e8400-e29b-41d4-a716-446655440000" }),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("@/lib/actions/crm-trash", () => ({
  deleteReminderWithTrash: vi.fn(),
  restoreReminderWithTrash: vi.fn(),
  deleteTimelineEntryWithTrash: vi.fn(),
  restoreTimelineEntryWithTrash: vi.fn(),
  restoreCompanyWithTrash: vi.fn(),
  deleteCompanyWithTrash: vi.fn(),
}));

vi.mock("@/components/features/companies/detail/LinkedContactsCard", () => ({
  default: () => null,
}));

vi.mock("@/components/features/companies/detail/RemindersCard", () => ({
  default: () => null,
}));

vi.mock("@/components/features/companies/detail/TimelineCard", () => ({
  default: () => null,
}));

vi.mock("@/components/features/companies/detail/CompanyCommentsCard", () => ({
  default: () => null,
}));

vi.mock("@/components/features/companies/detail/CompanyCommentAttachmentsCard", () => ({
  default: () => null,
}));

vi.mock("@/components/features/companies/ai-enrichment/AIEnrichmentModal", () => ({
  AIEnrichmentModal: () => null,
}));

vi.mock("@/lib/actions/companies", () => ({
  updateCompany: vi.fn(),
  updateCompanyWithOwner: vi.fn(),
  deleteCompany: vi.fn(),
}));

vi.mock("@/lib/actions/company-enrichment", () => ({
  researchCompanyEnrichment: vi.fn(async () => ({
    ok: true,
    data: { aiSummary: null, suggestions: {} },
    modelUsed: "anthropic/claude-sonnet-4.6",
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedUpdateCompany = vi.mocked(updateCompany);
const mockedUpdateCompanyWithOwner = vi.mocked(updateCompanyWithOwner);

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
    strasse: "Alter Weg 1",
    plz: "20095",
    stadt: "Hamburg",
    bundesland: null,
    land: "Deutschland",
    wasserdistanz: 100,
    wassertyp: "see",
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
    search_embedding: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <TooltipProvider>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </TooltipProvider>
      </NextIntlClientProvider>
    );
  };
}

function Harness({ initial }: { initial: Company }) {
  const [company, setCompany] = useState(initial);
  useEffect(() => {
    testCtx.registerSetCompany(setCompany);
    return () => {
      testCtx.unregisterSetCompany();
    };
  }, []);
  return (
    <Suspense fallback={null}>
      <CompanyDetailClient company={company} />
    </Suspense>
  );
}

function renderDetail(ui: ReactElement) {
  const Wrapper = createQueryWrapper();
  return render(ui, { wrapper: Wrapper });
}

function firmendatenAdresseCard(): HTMLElement {
  const el = screen.getByText(deMessages.companies.detailSectionFirmendaten).closest('[data-slot="card"]');
  if (!el) {
    throw new Error("Expected Firmendaten/Adresse card root");
  }
  return el as HTMLElement;
}

function requireHtmlElement(el: HTMLElement | undefined, message: string): HTMLElement {
  if (!el) {
    throw new Error(message);
  }
  return el;
}

describe("CompanyDetailClient refresh after inline edits", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    testCtx.lastPartial.current = {};
    vi.clearAllMocks();
    mockedUpdateCompany.mockImplementation(async (_id: string, updates: Partial<Company>) => {
      testCtx.lastPartial.current = { ...updates };
      return { ...mockCompanyRow(), ...updates } as Company;
    });
    mockedUpdateCompanyWithOwner.mockImplementation(async (raw: unknown) => {
      const input = raw as UpdateCompanyWithOwnerInput;
      const patch = { ...input.company, user_id: input.user_id };
      testCtx.lastPartial.current = patch;
      return { ...mockCompanyRow(), ...patch } as Company;
    });
  });

  it("updates Firmendaten card body after inline save (no full page reload)", async () => {
    const user = userEvent.setup();
    renderDetail(<Harness initial={mockCompanyRow()} />);

    await screen.findByRole("heading", { level: 1, name: "Fixture GmbH" });

    const card = firmendatenAdresseCard();
    const editButtons = within(card).getAllByRole("button");
    await user.click(requireHtmlElement(editButtons[0], "Firmendaten edit button"));

    await screen.findByRole("dialog", { name: "Firmendaten bearbeiten" });
    const dialog = screen.getByRole("dialog", { name: "Firmendaten bearbeiten" });
    const firmenname = within(dialog).getByRole("textbox", { name: /Firmenname/i });
    await user.clear(firmenname);
    await user.type(firmenname, "Neuer Firmenname GmbH");
    await user.click(within(dialog).getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(within(card).getByText("Neuer Firmenname GmbH")).toBeInTheDocument();
    });
  });

  it("updates Adresse card body after inline save", async () => {
    const user = userEvent.setup();
    renderDetail(<Harness initial={mockCompanyRow()} />);

    const card = firmendatenAdresseCard();
    await within(card).findByText("Alter Weg 1");

    const editButtons = within(card).getAllByRole("button");
    await user.click(requireHtmlElement(editButtons[1], "Adresse edit button"));

    await screen.findByRole("dialog", { name: "Adresse bearbeiten" });
    const dialog = screen.getByRole("dialog", { name: "Adresse bearbeiten" });
    const strasse = within(dialog).getByRole("textbox", { name: /Strasse/i });
    await user.clear(strasse);
    await user.type(strasse, "Hafenstraße 9");
    await user.click(within(dialog).getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(within(card).getByText("Hafenstraße 9")).toBeInTheDocument();
    });
  });

  it("updates AquaDock Daten card body after inline save", async () => {
    const user = userEvent.setup();
    renderDetail(<Harness initial={mockCompanyRow()} />);

    const card = screen.getByText(deMessages.companies.detailSectionAquadock).closest('[data-slot="card"]');
    if (!card) {
      throw new Error("Expected AquaDock card");
    }
    const cardEl = card as HTMLElement;
    await within(cardEl).findByText("100 m");

    // Locate the pencil by its aria-label so the test is resilient to new
    // sibling icon buttons in the card header (e.g. the geocode button).
    const editButton = within(cardEl).getByRole("button", {
      name: deMessages.companies.dialogEditAquadockTitle,
    });
    await user.click(editButton);

    await screen.findByRole("dialog", { name: "AquaDock-Daten bearbeiten" });
    const dialog = screen.getByRole("dialog", { name: "AquaDock-Daten bearbeiten" });
    const dist = within(dialog).getByRole("spinbutton", { name: /Wasserdistanz \(m\)/i });
    fireEvent.change(dist, { target: { value: "250" } });
    await user.click(within(dialog).getByRole("button", { name: /Änderungen speichern/i }));

    await waitFor(() => {
      expect(within(cardEl).getByText("250 m")).toBeInTheDocument();
    });
  });

  it("updates header title after full company edit dialog save", async () => {
    const user = userEvent.setup();
    renderDetail(<Harness initial={mockCompanyRow()} />);

    await screen.findByRole("heading", { name: "Fixture GmbH" });

    const toolbar = screen.getByRole("button", { name: /Aktivität/i }).parentElement;
    if (!toolbar) {
      throw new Error("Expected header toolbar");
    }
    const headerButtons = within(toolbar as HTMLElement).getAllByRole("button");
    await user.click(requireHtmlElement(headerButtons[1], "Header company edit button"));

    await screen.findByRole("dialog", { name: "Unternehmen bearbeiten" });
    const dialog = screen.getByRole("dialog", { name: "Unternehmen bearbeiten" });
    const firmenname = within(dialog).getByRole("textbox", { name: /Firmenname/i });
    await user.clear(firmenname);
    await user.type(firmenname, "Globally Edited AG");
    await user.click(within(dialog).getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Globally Edited AG" })).toBeInTheDocument();
    });
  });
});
