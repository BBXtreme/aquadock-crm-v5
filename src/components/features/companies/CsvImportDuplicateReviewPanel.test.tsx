import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CsvImportDuplicateRowAnalysis } from "@/lib/companies/csv-import-dedupe";
import type { ParsedCompanyRow } from "@/lib/utils/csv-import";
import deMessages from "@/messages/de.json";
import { CsvImportDuplicateReviewPanel } from "./CSVImportDuplicateReviewPanel";

const EXISTING = {
  id: "20000000-0000-4000-8000-000000000001",
  firmenname: "Bestehend GmbH",
  stadt: "Berlin",
  plz: "10115",
  website: "https://example.com",
  osm: "node/1",
};

function renderPanel(
  props: Partial<ComponentProps<typeof CsvImportDuplicateReviewPanel>> & {
    analyses?: CsvImportDuplicateRowAnalysis[] | null;
    rows?: ParsedCompanyRow[];
  } = {},
) {
  const onToggleForce = props.onToggleForce ?? vi.fn();
  const rows: ParsedCompanyRow[] = props.rows ?? [
    { firmenname: "CSV GmbH", kundentyp: "restaurant", osm: "node/1" },
  ];
  const analyses: CsvImportDuplicateRowAnalysis[] | null = props.analyses ?? [
    {
      rowIndex: 0,
      dbMatch: { tier: "osm", existing: EXISTING },
      internalDuplicate: null,
    },
  ];
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <CsvImportDuplicateReviewPanel
        rows={rows}
        analyses={analyses}
        isLoading={props.isLoading ?? false}
        error={props.error ?? null}
        forceImportByIndex={props.forceImportByIndex ?? {}}
        onToggleForce={onToggleForce}
        onRetry={props.onRetry}
        isImporting={props.isImporting ?? false}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("CsvImportDuplicateReviewPanel", () => {
  it("renders duplicate row when analyses present", () => {
    renderPanel();
    expect(screen.getByText(/CSV GmbH/)).toBeInTheDocument();
    expect(screen.getByText(/Bestehend GmbH/)).toBeInTheDocument();
  });

  it("calls onToggleForce when import-anyway is checked", async () => {
    const user = userEvent.setup();
    const onToggleForce = vi.fn();
    renderPanel({
      onToggleForce,
      analyses: [
        {
          rowIndex: 0,
          dbMatch: { tier: "website", existing: EXISTING },
          internalDuplicate: null,
        },
      ],
    });
    const region = screen.getByRole("table");
    const cb = within(region).getByRole("checkbox");
    await user.click(cb);
    expect(onToggleForce).toHaveBeenCalledWith(0, true);
  });

  it("shows loading state", () => {
    renderPanel({ isLoading: true, analyses: null });
    expect(screen.getByText("Prüfe auf Duplikate…")).toBeInTheDocument();
  });
});
