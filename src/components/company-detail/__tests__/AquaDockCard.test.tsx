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
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import deMessages from "@/messages/de.json";
import type { Company } from "@/types/database.types";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/companies/test-id",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "test-id" }),
}));

vi.mock("@/components/features/companies/AquaDockEditForm", () => ({
  default: () => null,
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
