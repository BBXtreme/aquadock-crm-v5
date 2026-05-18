import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import StandortanalysenTable from "@/components/tables/StandortanalysenTable";

const sampleAnalysis = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "draft" as const,
  created_at: "2026-05-18T10:00:00.000Z",
  updated_at: "2026-05-18T12:00:00.000Z",
  total_points: 42,
  recommendation: "Geeignet",
  standort_ort: "Hamburg",
  kontakt_name: "Max Mustermann",
  submitted_at: null,
};

describe("StandortanalysenTable", () => {
  it("renders toolbar search and row actions", () => {
    render(
      <StandortanalysenTable
        analyses={[sampleAnalysis]}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onSyncCrm={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Suche nach Kontakt oder Ort")).toBeInTheDocument();
    expect(screen.getByText("Max Mustermann")).toBeInTheDocument();
    expect(screen.getByLabelText("Analyse ansehen")).toBeInTheDocument();
    expect(screen.getByLabelText("Analyse bearbeiten")).toBeInTheDocument();
    expect(screen.getByLabelText("Im CRM übernehmen")).toBeInTheDocument();
    expect(screen.getByLabelText("Analyse löschen")).toBeInTheDocument();
  });

  it("opens a confirmation dialog when an action icon is clicked", async () => {
    const user = userEvent.setup();

    render(
      <StandortanalysenTable
        analyses={[sampleAnalysis]}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onSyncCrm={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Analyse ansehen"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Analyse ansehen?");

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Analyse bearbeiten"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Analyse bearbeiten?");

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    await user.click(screen.getByLabelText("Im CRM übernehmen"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Im CRM übernehmen?");

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    await user.click(screen.getByLabelText("Analyse löschen"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Analyse löschen?");
  });
});
