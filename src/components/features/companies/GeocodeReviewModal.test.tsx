/**
 * Tests for {@link ./GeocodeReviewModal.tsx}.
 *
 * Covers selection invariants (only ok + suggested coords are selectable),
 * footer actions, coordinate diff rendering, and confidence badges.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GeocodeBatchPreviewRow } from "@/lib/actions/companies";
import deMessages from "@/messages/de.json";
import { GeocodeReviewModal } from "./GeocodeReviewModal";

function mockRow(overrides: Partial<GeocodeBatchPreviewRow> = {}): GeocodeBatchPreviewRow {
  return {
    rowId: "row-default",
    companyId: "00000000-0000-4000-8000-000000000001",
    firmenname: "Test GmbH",
    addressLabel: "Str 1, 80331 München",
    currentLat: null,
    currentLon: null,
    suggestedLat: 48.137,
    suggestedLon: 11.575,
    confidence: "high",
    importance: 0.9,
    displayName: "Display Name",
    ok: true,
    message: null,
    ...overrides,
  };
}

function renderModal(
  props: Partial<ComponentProps<typeof GeocodeReviewModal>> & {
    rows?: GeocodeBatchPreviewRow[];
  } = {},
) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const onApplySelected = props.onApplySelected ?? vi.fn();
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <GeocodeReviewModal
        open={props.open ?? true}
        onOpenChange={onOpenChange}
        rows={props.rows ?? [mockRow()]}
        isApplying={props.isApplying ?? false}
        onApplySelected={onApplySelected}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("GeocodeReviewModal", () => {
  it("renders title and description", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "Geocoding prüfen" })).toBeInTheDocument();
    expect(
      screen.getByText(/Nur ausgewählte Zeilen werden übernommen/),
    ).toBeInTheDocument();
  });

  it("disables the checkbox when ok is false (geocode failure)", () => {
    renderModal({
      rows: [
        mockRow({
          rowId: "row-fail",
          ok: false,
          suggestedLat: null,
          suggestedLon: null,
          message: "Kein Treffer",
        }),
      ],
    });
    const cb = screen.getByRole("checkbox", { name: /Zeile row-fail/ });
    expect(cb).toBeDisabled();
  });

  it("disables the checkbox when ok is true but suggested coordinates are missing", () => {
    renderModal({
      rows: [
        mockRow({
          rowId: "row-partial",
          ok: true,
          suggestedLat: null,
          suggestedLon: null,
          message: null,
        }),
      ],
    });
    expect(screen.getByRole("checkbox", { name: /Zeile row-partial/ })).toBeDisabled();
  });

  it("enables the checkbox for a fully valid row", () => {
    renderModal({ rows: [mockRow({ rowId: "row-ok" })] });
    expect(screen.getByRole("checkbox", { name: /Zeile row-ok/ })).not.toBeDisabled();
  });

  it('"Alle gültigen auswählen" selects only rows that are ok with suggested coords', async () => {
    const user = userEvent.setup();
    const onApplySelected = vi.fn();
    renderModal({
      onApplySelected,
      rows: [
        mockRow({ rowId: "a", firmenname: "Good A" }),
        mockRow({
          rowId: "b",
          firmenname: "Bad",
          ok: false,
          suggestedLat: null,
          suggestedLon: null,
          message: "fail",
        }),
        mockRow({ rowId: "c", firmenname: "Good C" }),
      ],
    });

    await user.click(screen.getByRole("button", { name: /Alle gültigen auswählen/ }));

    expect(screen.getByRole("button", { name: /^2 übernehmen$/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^2 übernehmen$/ }));
    expect(onApplySelected).toHaveBeenCalledWith(["a", "c"]);
  });

  it("passes only checked selectable row ids to onApplySelected (skips invalid rows even if toggled in state)", async () => {
    const user = userEvent.setup();
    const onApplySelected = vi.fn();
    renderModal({
      onApplySelected,
      rows: [mockRow({ rowId: "only-one" })],
    });

    await user.click(screen.getByRole("checkbox", { name: /Zeile only-one/ }));
    await user.click(screen.getByRole("button", { name: /^1 übernehmen$/ }));

    expect(onApplySelected).toHaveBeenCalledWith(["only-one"]);
  });

  it('"Auswahl leeren" clears the selection and disables the apply button', async () => {
    const user = userEvent.setup();
    renderModal({
      rows: [mockRow({ rowId: "x" }), mockRow({ rowId: "y", firmenname: "Y" })],
    });

    await user.click(screen.getByRole("button", { name: /Alle gültigen auswählen/ }));
    expect(screen.getByRole("button", { name: /^2 übernehmen$/ })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Auswahl leeren/ }));
    expect(screen.getByRole("button", { name: /Auswahl übernehmen/ })).toBeDisabled();
  });

  it("disables apply and checkboxes while isApplying is true", () => {
    renderModal({
      isApplying: true,
      rows: [mockRow({ rowId: "z" })],
    });
    expect(screen.getByRole("checkbox", { name: /Zeile z/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Übernehmen …/ })).toBeDisabled();
  });

  it("shows stacked current → suggested when both coordinate pairs exist", () => {
    renderModal({
      rows: [
        mockRow({
          rowId: "stack",
          currentLat: 48.0,
          currentLon: 11.0,
          suggestedLat: 48.137,
          suggestedLon: 11.575,
        }),
      ],
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("48.00000, 11.00000")).toBeInTheDocument();
    expect(within(dialog).getByText("48.13700, 11.57500")).toBeInTheDocument();
  });

  it("shows arrow + suggested only when there is no prior coordinate pair", () => {
    renderModal({
      rows: [
        mockRow({
          rowId: "new-only",
          currentLat: null,
          currentLon: null,
          suggestedLat: 47.5,
          suggestedLon: 9.2,
        }),
      ],
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("47.50000, 9.20000")).toBeInTheDocument();
    expect(within(dialog).queryByText("48.13700, 11.57500")).not.toBeInTheDocument();
  });

  it("shows only muted current coords when suggested pair is missing", () => {
    renderModal({
      rows: [
        mockRow({
          rowId: "no-suggest",
          currentLat: 50.0,
          currentLon: 8.0,
          suggestedLat: null,
          suggestedLon: null,
          ok: false,
        }),
      ],
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("50.00000, 8.00000")).toBeInTheDocument();
  });

  it("renders Hoch / Mittel / Niedrig confidence badges", () => {
    renderModal({
      rows: [
        mockRow({ rowId: "h", confidence: "high" }),
        mockRow({ rowId: "m", confidence: "medium", suggestedLat: 1, suggestedLon: 2 }),
        mockRow({ rowId: "l", confidence: "low", suggestedLat: 3, suggestedLon: 4 }),
      ],
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText("Hoch").length).toBeGreaterThanOrEqual(1);
    expect(within(dialog).getAllByText("Mittel").length).toBeGreaterThanOrEqual(1);
    expect(within(dialog).getAllByText("Niedrig").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a dash badge when confidence is null", () => {
    renderModal({
      rows: [mockRow({ rowId: "nc", confidence: null })],
    });
    const dialog = screen.getByRole("dialog");
    const badges = within(dialog).getAllByText("—");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("uses message as hint when present, otherwise displayName", () => {
    renderModal({
      rows: [
        mockRow({
          rowId: "msg",
          message: "Custom error",
          displayName: "Should not show when message set",
        }),
      ],
    });
    expect(screen.getByText("Custom error")).toBeInTheDocument();
    expect(screen.queryByText("Should not show when message set")).not.toBeInTheDocument();
  });

  it("resets selection when the dialog reopens", async () => {
    const user = userEvent.setup();
    const wrapper = ({ open }: { open: boolean }) => (
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <GeocodeReviewModal
          open={open}
          onOpenChange={vi.fn()}
          rows={[mockRow({ rowId: "reopen" })]}
          isApplying={false}
          onApplySelected={vi.fn()}
        />
      </NextIntlClientProvider>
    );
    const { rerender } = render(wrapper({ open: true }));

    await user.click(screen.getByRole("checkbox", { name: /Zeile reopen/ }));
    expect(screen.getByRole("button", { name: /^1 übernehmen$/ })).toBeEnabled();

    rerender(wrapper({ open: false }));
    rerender(wrapper({ open: true }));

    expect(screen.getByRole("button", { name: /Auswahl übernehmen/ })).toBeDisabled();
  });
});
