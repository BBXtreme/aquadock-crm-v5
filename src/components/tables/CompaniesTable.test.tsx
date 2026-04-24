/**
 * Smoke tests for {@link ./CompaniesTable.tsx} (production table used by companies list).
 * Full table behavior is covered by E2E; this file guards regressions in headers and empty state.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import type { Company, Contact } from "@/types/database.types";
import CompaniesTable from "./CompaniesTable";

function mockCompany(overrides: Partial<Company & { contacts?: Contact[] }> = {}): Company & { contacts?: Contact[] } {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    firmenname: "Default GmbH",
    kundentyp: "marina",
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
    land: null,
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
    search_embedding: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const defaultHandlers = {
  onPaginationChange: vi.fn(),
  onSortingChange: vi.fn(),
  onRowSelectionChange: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CompaniesTable", () => {
  it("shows empty state when there are no companies", () => {
    renderWithIntl(
      <CompaniesTable
        companies={[]}
        pageCount={0}
        sorting={[]}
        rowSelection={{}}
        totalFilteredCount={0}
        {...defaultHandlers}
      />,
    );
    expect(screen.getByText(enMessages.companies.tableEmpty)).toBeInTheDocument();
  });

  it("renders column headers and company name for one row", () => {
    renderWithIntl(
      <CompaniesTable
        companies={[mockCompany({ firmenname: "Nordsee Marina" })]}
        pageCount={1}
        sorting={[]}
        rowSelection={{}}
        totalFilteredCount={1}
        {...defaultHandlers}
      />,
    );
    expect(screen.getByRole("columnheader", { name: enMessages.companies.tableColFirmenname })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: enMessages.companies.tableColAdresse })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nordsee Marina" })).toBeInTheDocument();
  });
});
