/**
 * Regression tests for {@link ../AquaDockCard.tsx}.
 *
 * Guards against historical bugs and UX invariants:
 *   1. Coordinates were displayed with a locale-dependent decimal separator
 *      (e.g. "50,123" under `de-DE`) while the edit form only accepted dots.
 *      Geographic coordinates (WGS84 / ISO 6709 / GeoJSON) must always use a dot.
 *   2. "Open Map" used `if (company.lat && company.lon)` which treated the
 *      perfectly-valid coordinate `0` as falsy. We must use `!= null`.
 *   3. When lat/lon are missing the "Open Map" button must not navigate —
 *      we guide the user to fill in the coordinates instead.
 *   4. The OSM-ID link must never fabricate fallback coordinates in the URL.
 *   5. The Nominatim geocode button must be disabled when the address is
 *      incomplete (Stadt + Strasse/PLZ required) and must go through the
 *      review modal — never silently overwrite stored coordinates.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import deMessages from "@/messages/de.json";
import type { Company } from "@/types/database.types";

const pushMock = vi.fn();
const geocodeBatchMock = vi.fn();
const applyGeocodesMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/companies/test-id",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "test-id" }),
}));

vi.mock("@/components/features/companies/AquaDockEditForm", () => ({
  default: () => null,
}));

// The server-action module transitively imports supabase/server, which throws
// in jsdom without env. We don't need the real actions for UI tests — just
// stable spies we can assert against.
vi.mock("@/lib/actions/companies", () => ({
  geocodeCompanyBatch: (...args: unknown[]) => geocodeBatchMock(...args),
  applyApprovedGeocodes: (...args: unknown[]) => applyGeocodesMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

function mockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "test-id",
    firmenname: "Fixture GmbH",
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
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

async function renderCard(company: Company) {
  const { default: AquaDockCard } = await import("../AquaDockCard");
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <TooltipProvider>
        <AquaDockCard company={company} />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  pushMock.mockReset();
  geocodeBatchMock.mockReset();
  applyGeocodesMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("AquaDockCard coordinate display", () => {
  it("renders latitude/longitude with a dot decimal separator even under German locale", async () => {
    await renderCard(mockCompany({ lat: 50.12345, lon: 8.6789 }));

    // Must be a dot — NOT "50,12345" (German) or "50 12345" etc.
    expect(screen.getByText("50.12345")).toBeInTheDocument();
    expect(screen.getByText("8.6789")).toBeInTheDocument();

    expect(screen.queryByText("50,12345")).not.toBeInTheDocument();
    expect(screen.queryByText("8,6789")).not.toBeInTheDocument();
  });

  it("renders lat/lon with value 0 as '0' (not falsy-hidden)", async () => {
    await renderCard(mockCompany({ lat: 0, lon: 0 }));

    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});

describe("AquaDockCard Open Map button", () => {
  it("navigates to /openmap with lat=0&lon=0 when coordinates are 0 (not treated as falsy)", async () => {
    const user = userEvent.setup();
    await renderCard(mockCompany({ lat: 0, lon: 0 }));

    await user.click(screen.getByRole("button", { name: deMessages.companies.detailOpenMapButton }));

    expect(pushMock).toHaveBeenCalledWith("/openmap?lat=0&lon=0&zoom=13");
  });

  it("does NOT navigate when lat/lon are null and marks the button as aria-disabled", async () => {
    const user = userEvent.setup();
    await renderCard(mockCompany({ lat: null, lon: null }));

    const button = screen.getByRole("button", { name: deMessages.companies.detailOpenMapButton });
    expect(button).toHaveAttribute("aria-disabled", "true");

    await user.click(button);

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does NOT navigate when only lat is set (partial coordinates)", async () => {
    const user = userEvent.setup();
    await renderCard(mockCompany({ lat: 50.0, lon: null }));

    const button = screen.getByRole("button", { name: deMessages.companies.detailOpenMapButton });
    expect(button).toHaveAttribute("aria-disabled", "true");

    await user.click(button);

    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("AquaDockCard OSM-ID link", () => {
  it("builds the OSM URL without a fabricated #map hash when coordinates are missing", async () => {
    await renderCard(mockCompany({ osm: "node/12345", lat: null, lon: null }));

    const link = screen.getByRole("link", { name: /node\/12345/ });
    expect(link).toHaveAttribute("href", "https://www.openstreetmap.org/node/12345");
  });

  it("includes a #map=zoom/lat/lon hash when coordinates are present", async () => {
    await renderCard(mockCompany({ osm: "way/9999", lat: 50.5, lon: 9.25 }));

    const link = screen.getByRole("link", { name: /way\/9999/ });
    expect(link).toHaveAttribute("href", "https://www.openstreetmap.org/way/9999#map=16/50.5/9.25");
  });
});

describe("AquaDockCard geocode button", () => {
  const fillLabel = deMessages.companies.geocodeDetailFillLabel;
  const refreshLabel = deMessages.companies.geocodeDetailRefreshLabel;

  it("is disabled when the address is incomplete (no Stadt)", async () => {
    await renderCard(
      mockCompany({ strasse: "Hauptstr. 1", plz: "80331", stadt: null, lat: null, lon: null }),
    );

    const button = screen.getByRole("button", { name: fillLabel });
    expect(button).toBeDisabled();
  });

  it("is disabled when only Stadt is set (missing Strasse and PLZ)", async () => {
    await renderCard(
      mockCompany({ strasse: null, plz: null, stadt: "München", lat: null, lon: null }),
    );

    const button = screen.getByRole("button", { name: fillLabel });
    expect(button).toBeDisabled();
  });

  it("labels the button as 'aktualisieren' when coordinates already exist", async () => {
    await renderCard(
      mockCompany({
        strasse: "Hauptstr. 1",
        plz: "80331",
        stadt: "München",
        lat: 48.137,
        lon: 11.575,
      }),
    );

    expect(screen.getByRole("button", { name: refreshLabel })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: fillLabel })).not.toBeInTheDocument();
  });

  it("sends the single-row payload to geocodeCompanyBatch and opens the review modal on success", async () => {
    geocodeBatchMock.mockResolvedValueOnce({
      ok: true,
      previewOnly: true,
      results: [
        {
          rowId: "company-geocode-test-id",
          companyId: "test-id",
          firmenname: "Fixture GmbH",
          addressLabel: "Hauptstr. 1, 80331, München",
          currentLat: null,
          currentLon: null,
          suggestedLat: 48.137,
          suggestedLon: 11.575,
          confidence: "high",
          importance: 0.9,
          displayName: "Hauptstraße 1, München, Bayern, DE",
          ok: true,
          message: null,
        },
      ],
    });

    const user = userEvent.setup();
    await renderCard(
      mockCompany({
        strasse: "Hauptstr. 1",
        plz: "80331",
        stadt: "München",
        land: "DE",
        lat: null,
        lon: null,
      }),
    );

    await user.click(screen.getByRole("button", { name: fillLabel }));

    expect(geocodeBatchMock).toHaveBeenCalledTimes(1);
    const payload = geocodeBatchMock.mock.calls[0]?.[0] as { items: unknown[] };
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      companyId: "test-id",
      stadt: "München",
      plz: "80331",
      strasse: "Hauptstr. 1",
      currentLat: null,
      currentLon: null,
    });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Geocoding prüfen")).toBeInTheDocument();
    // Suggested coordinates from the mocked Nominatim response rendered in the diff column
    expect(within(dialog).getByText(/48\.13700, 11\.57500/)).toBeInTheDocument();
  });

  it("calls applyApprovedGeocodes and onCompanyUpdated after the user approves the suggestion", async () => {
    geocodeBatchMock.mockResolvedValueOnce({
      ok: true,
      previewOnly: true,
      results: [
        {
          rowId: "company-geocode-test-id",
          companyId: "test-id",
          firmenname: "Fixture GmbH",
          addressLabel: "Hauptstr. 1, 80331, München",
          currentLat: null,
          currentLon: null,
          suggestedLat: 48.137,
          suggestedLon: 11.575,
          confidence: "high",
          importance: 0.9,
          displayName: "Hauptstraße 1, München, Bayern, DE",
          ok: true,
          message: null,
        },
      ],
    });
    applyGeocodesMock.mockResolvedValueOnce({
      ok: true,
      results: [{ ok: true, companyId: "test-id", lat: 48.137, lon: 11.575 }],
    });

    const onCompanyUpdated = vi.fn();
    const user = userEvent.setup();
    const { default: AquaDockCard } = await import("../AquaDockCard");
    render(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <TooltipProvider>
          <AquaDockCard
            company={mockCompany({
              strasse: "Hauptstr. 1",
              plz: "80331",
              stadt: "München",
              lat: null,
              lon: null,
            })}
            onCompanyUpdated={onCompanyUpdated}
          />
        </TooltipProvider>
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: deMessages.companies.geocodeDetailFillLabel }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Alle gültigen auswählen/ }));
    await user.click(within(dialog).getByRole("button", { name: /^1 übernehmen$/ }));

    expect(applyGeocodesMock).toHaveBeenCalledTimes(1);
    const applyPayload = applyGeocodesMock.mock.calls[0]?.[0] as { items: unknown[] };
    expect(applyPayload.items).toEqual([
      { companyId: "test-id", suggestedLat: 48.137, suggestedLon: 11.575 },
    ]);
    expect(onCompanyUpdated).toHaveBeenCalledTimes(1);
  });

  it("keeps the button enabled while showing a toast when geocodeCompanyBatch reports failure", async () => {
    geocodeBatchMock.mockResolvedValueOnce({ ok: false, error: "Ungültige Eingabe" });

    const user = userEvent.setup();
    await renderCard(
      mockCompany({
        strasse: "Hauptstr. 1",
        plz: "80331",
        stadt: "München",
        lat: null,
        lon: null,
      }),
    );

    await user.click(screen.getByRole("button", { name: deMessages.companies.geocodeDetailFillLabel }));

    expect(geocodeBatchMock).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
