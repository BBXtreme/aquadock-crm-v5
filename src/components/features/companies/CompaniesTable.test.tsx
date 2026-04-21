/**
 * Behavior tests for {@link ./CompaniesTable.tsx} (TanStack Table v8, `ColumnDef<CompanyWithContacts>[]`).
 * Column typing follows docs/react-table-v8-ts-tricks.md (array satisfies / explicit `ColumnDef<T>[]` in the component).
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Company, Contact } from "@/types/database.types";
import CompaniesTable from "./CompaniesTable";

type CompanyWithContacts = Company & { contacts?: Contact[] };

type TableProps = ComponentProps<typeof CompaniesTable>;

function mockCompany(overrides: Partial<CompanyWithContacts> = {}): CompanyWithContacts {
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

function mockContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    vorname: "Max",
    nachname: "Mustermann",
    anrede: null,
    company_id: "550e8400-e29b-41d4-a716-446655440000",
    created_at: null,
    created_by: null,
    deleted_at: null,
    deleted_by: null,
    durchwahl: null,
    email: null,
    is_primary: false,
    mobil: null,
    notes: null,
    position: null,
    search_vector: null,
    telefon: null,
    updated_at: null,
    updated_by: null,
    user_id: null,
    ...overrides,
  };
}

function renderCompaniesTable(overrideProps: Partial<TableProps> & Pick<TableProps, "companies">) {
  const onPaginationChange = overrideProps.onPaginationChange ?? vi.fn();
  const onSortingChange = overrideProps.onSortingChange ?? vi.fn();
  const props: TableProps = {
    companies: overrideProps.companies,
    pageCount: overrideProps.pageCount ?? 1,
    onPaginationChange,
    sorting: overrideProps.sorting ?? [],
    onSortingChange,
    globalFilter: overrideProps.globalFilter,
    onGlobalFilterChange: overrideProps.onGlobalFilterChange,
    onEdit: overrideProps.onEdit,
    onDelete: overrideProps.onDelete,
    onImportCSV: overrideProps.onImportCSV,
    rowSelection: overrideProps.rowSelection,
    onRowSelectionChange: overrideProps.onRowSelectionChange,
  };
  return {
    ...render(<CompaniesTable {...props} />),
    onPaginationChange,
    onSortingChange,
  };
}

afterEach(() => {
  cleanup();
});

describe("CompaniesTable", () => {
  it("renders column headers", () => {
    renderCompaniesTable({ companies: [mockCompany({ firmenname: "A" })] });
    expect(screen.getByRole("columnheader", { name: /Company/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Address$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Contact$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Status$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Value$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Contacts$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Actions$/i })).toBeInTheDocument();
  });

  it("shows empty state when companies array is empty", () => {
    renderCompaniesTable({ companies: [] });
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("renders firmenname, raw kundentyp line, address via safeDisplay, status badge, and € value", () => {
    const row = mockCompany({
      firmenname: "Nordsee Marina",
      kundentyp: "hotel",
      status: "gewonnen",
      strasse: "Am Kai 2",
      plz: "27498",
      stadt: "List",
      land: "Deutschland",
      telefon: "+49 40 123",
      email: "info@example.org",
      value: 99_000,
    });
    renderCompaniesTable({ companies: [row] });

    expect(screen.getByText("Nordsee Marina")).toBeInTheDocument();
    expect(screen.getByText("hotel")).toBeInTheDocument();
    expect(screen.getByText("Am Kai 2")).toBeInTheDocument();
    expect(screen.getByText(/27498\s+List/)).toBeInTheDocument();
    expect(screen.getByText("Deutschland")).toBeInTheDocument();
    expect(screen.getByText("+49 40 123")).toBeInTheDocument();
    expect(screen.getByText("info@example.org")).toBeInTheDocument();

    const statusBadge = screen.getByText("gewonnen");
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass("bg-emerald-600");

    expect(screen.getByText("€99000")).toBeInTheDocument();
  });

  it("uses safeDisplay fallback for nullable address and contact fields", () => {
    renderCompaniesTable({
      companies: [
        mockCompany({
          firmenname: "Sparse AG",
          strasse: null,
          plz: null,
          stadt: null,
          land: null,
          telefon: null,
          email: null,
        }),
      ],
    });

    const row = screen.getByRole("row", { name: /Sparse AG/i });
    const view = within(row);
    const dashes = view.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it("renders contacts column with primary name and extra count", () => {
    const withPrimary = mockCompany({
      firmenname: "With Primary",
      contacts: [
        mockContact({ is_primary: true, vorname: "Anna", nachname: "Schmidt" }),
        mockContact({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", is_primary: false, vorname: "Ben", nachname: "B" }),
      ],
    });
    renderCompaniesTable({ companies: [withPrimary] });
    expect(screen.getByText("Anna Schmidt")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("renders contacts column None when there are no contacts", () => {
    renderCompaniesTable({
      companies: [mockCompany({ firmenname: "No Contacts", contacts: [] })],
    });
    const row = screen.getByRole("row", { name: /No Contacts/i });
    expect(within(row).getByText("None")).toBeInTheDocument();
  });

  it("applies lead status badge styling", () => {
    renderCompaniesTable({
      companies: [mockCompany({ firmenname: "Lead Co", status: "lead" })],
    });
    const row = screen.getByRole("row", { name: /Lead Co/i });
    const badge = within(row).getByText("lead");
    expect(badge).toHaveClass("bg-amber-600");
  });

  it("renders actions trigger when onEdit / onDelete provided", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderCompaniesTable({
      companies: [mockCompany({ firmenname: "Action Co" })],
      onEdit,
      onDelete,
    });
    const row = screen.getByRole("row", { name: /Action Co/i });
    expect(within(row).getByRole("button", { name: /Open menu/i })).toBeInTheDocument();
  });

  it("smoke: global filter input notifies onGlobalFilterChange", async () => {
    const user = userEvent.setup();
    const onGlobalFilterChange = vi.fn();
    function GlobalFilterHarness() {
      const [globalFilter, setGlobalFilter] = useState("");
      return (
        <CompaniesTable
          companies={[mockCompany()]}
          pageCount={1}
          onPaginationChange={vi.fn()}
          sorting={[]}
          onSortingChange={vi.fn()}
          globalFilter={globalFilter}
          onGlobalFilterChange={(value) => {
            onGlobalFilterChange(value);
            setGlobalFilter(value);
          }}
        />
      );
    }
    const { container } = render(<GlobalFilterHarness />);
    const search = container.querySelector("input[placeholder=\"Search companies...\"]");
    if (!(search instanceof HTMLInputElement)) {
      throw new Error("expected search input");
    }
    await user.type(search, "marina");
    expect(onGlobalFilterChange).toHaveBeenCalled();
    expect(onGlobalFilterChange.mock.calls.some(([v]) => v === "marina")).toBe(true);
  });

  it("smoke: Company sort header notifies onSortingChange", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    const { container } = renderCompaniesTable({
      companies: [mockCompany({ firmenname: "Sort Co" })],
      onSortingChange,
    });
    const table = container.querySelector("table");
    if (!table) {
      throw new Error("expected table");
    }
    const sortBtn = within(table).getByRole("button", { name: /Company/i });
    await user.click(sortBtn);
    expect(onSortingChange).toHaveBeenCalled();
  });

  it("smoke: pagination Next notifies onPaginationChange when another page exists", async () => {
    const user = userEvent.setup();
    const { onPaginationChange, container } = renderCompaniesTable({
      companies: [mockCompany({ firmenname: "Page 1 Co" })],
      pageCount: 2,
    });
    const root = container.firstElementChild;
    if (!(root instanceof HTMLElement)) {
      throw new Error("expected root");
    }
    await user.click(within(root).getByRole("button", { name: /^Next$/i }));
    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 20 });
  });

  it("shows Import CSV when onImportCSV is provided", async () => {
    const user = userEvent.setup();
    const onImportCSV = vi.fn();
    const { container } = renderCompaniesTable({
      companies: [mockCompany({ firmenname: "Import Co" })],
      onImportCSV,
    });
    const root = container.firstElementChild;
    if (!(root instanceof HTMLElement)) {
      throw new Error("expected root");
    }
    await user.click(within(root).getByRole("button", { name: /Import CSV/i }));
    expect(onImportCSV).toHaveBeenCalledTimes(1);
  });

  it("shows row selection summary", () => {
    renderCompaniesTable({
      companies: [mockCompany({ firmenname: "Sel Co" })],
    });
    expect(screen.getByText(/0 of 1 row\(s\) selected\./)).toBeInTheDocument();
  });
});
