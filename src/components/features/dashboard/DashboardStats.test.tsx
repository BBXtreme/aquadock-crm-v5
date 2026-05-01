/**
 * Dashboard KPI / statistics: {@link ./DashboardClient.tsx} (StatCard row + period filter).
 * The CRM dashboard shows companies, active leads, won deals, and pipeline value (€ + locale). Contacts/timeline feed the query but are not separate KPI tiles yet.
 * Extended patterns for reminders / overdue use {@link ../../../components/ui/StatCard.tsx} with {@link ../../../lib/utils/data-format.ts}.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Building } from "lucide-react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardClient from "@/components/features/dashboard/DashboardClient";
import { StatCard } from "@/components/ui/StatCard";
import type { DashboardKpis } from "@/lib/services/dashboard-kpis";
import { formatCurrency, safeDisplay } from "@/lib/utils/data-format";

vi.mock("@/lib/i18n/use-translations", () => ({
  useT: () => dashboardTranslator,
  useNumberLocaleTag: () => "en-US",
}));

const mockFetch = vi.hoisted(() => vi.fn());

/** Matches the legacy fixture totals: 4 companies, 3 contacts, 2 timeline, 2 leads, 1 won, €3,845 pipeline. */
const initialKpisFixture: DashboardKpis = {
  totalCompanies: 4,
  totalContacts: 3,
  totalActivities: 2,
  companiesInPeriod: 4,
  totalValue: 3845,
  leads: 2,
  won: 1,
  period: "30d",
};

const emptyKpis: DashboardKpis = {
  totalCompanies: 0,
  totalContacts: 0,
  totalActivities: 0,
  companiesInPeriod: 0,
  totalValue: 0,
  leads: 0,
  won: 0,
  period: "30d",
};

function dashboardTranslator(key: string, values?: { count?: number }): string {
  const dict: Record<string, string> = {
    kpiTotalCompanies: "Total companies",
    kpiActiveLeads: "Active leads",
    kpiWonDeals: "Won deals",
    kpiPipelineValue: "Total pipeline value",
    kpiChangeThisPeriod: "+{count} this period",
    kpiChangeDash: "—",
    funnelTitle: "Sales funnel",
    funnelSubtitle: "Conversion pipeline",
    statusTitle: "Status overview",
    period7d: "Last 7 days",
    period30d: "Last 30 days",
    period90d: "Last 90 days",
    "funnel.leads": "Leads",
    "funnel.qualified": "Qualified",
    "funnel.proposal": "Proposal",
    "funnel.negotiation": "Negotiation",
    "funnel.closedWon": "Closed won",
  };
  if (key === "kpiChangeThisPeriod" && values?.count !== undefined) {
    return `+${values.count} this period`;
  }
  const raw = dict[key];
  return raw ?? key;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderDashboard(initialKpis: DashboardKpis = initialKpisFixture) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <div data-testid="dashboard-kpi-root">
        <Suspense fallback={<div data-testid="dashboard-suspense-fallback">Loading dashboard…</div>}>
          <DashboardClient initialKpis={initialKpis} />
        </Suspense>
      </div>
    </QueryClientProvider>,
  );
}

function kpiRoot(): HTMLElement {
  const el = screen.getByTestId("dashboard-kpi-root");
  return el;
}

/**
 * Dashboard period filter uses shadcn Select (Radix), not a native HTML select.
 * The trigger exposes role="combobox" and its accessible name comes from the displayed
 * value (e.g. mocked `period30d` → "Last 30 days"). Options mount in a Radix portal on
 * `document.body`, so after opening the menu use `screen.getByRole("option", …)` — not
 * `within(container)`.
 */
function getPeriodSelectTrigger(container: HTMLElement): HTMLElement {
  /* Radix trigger is role="combobox"; in jsdom the computed accessible name is often empty,
   * but the mocked period label is still visible as text inside the trigger. */
  return within(container).getByRole("combobox");
}

/**
 * Radix Select relies on browser APIs that jsdom omits or stubs poorly.
 * Without these, opening the period Select throws during pointer / focus handling.
 */
function ensureRadixSelectEnvironmentPolyfills(): void {
  const proto = Element.prototype as Element & {
    hasPointerCapture?: (id: number) => boolean;
    setPointerCapture?: (id: number) => void;
    releasePointerCapture?: (id: number) => void;
    scrollIntoView?: (arg?: boolean | ScrollIntoViewOptions) => void;
  };
  if (typeof proto.hasPointerCapture !== "function") {
    proto.hasPointerCapture = () => false;
  }
  if (typeof proto.setPointerCapture !== "function") {
    proto.setPointerCapture = () => undefined;
  }
  if (typeof proto.releasePointerCapture !== "function") {
    proto.releasePointerCapture = () => undefined;
  }
  if (typeof proto.scrollIntoView !== "function") {
    proto.scrollIntoView = () => undefined;
  }
}

afterEach(() => {
  cleanup();
});

/** Recharts `ResponsiveContainer` needs a resize callback; a no-op observe leaves 0×0 and spams stderr. */
class TestResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element): void {
    const contentRect: DOMRectReadOnly = {
      width: 640,
      height: 320,
      top: 0,
      left: 0,
      bottom: 320,
      right: 640,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    };
    this.callback(
      [
        {
          target: element,
          contentRect,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  unobserve(): void {
    /* Recharts / ResponsiveContainer */
  }

  disconnect(): void {
    /* Recharts / ResponsiveContainer */
  }
}

describe("DashboardClient KPI statistics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureRadixSelectEnvironmentPolyfills();
    globalThis.ResizeObserver = TestResizeObserver;
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const period = url.includes("period=7d") ? "7d" : url.includes("period=90d") ? "90d" : "30d";
      const payload: DashboardKpis = {
        ...initialKpisFixture,
        period,
        companiesInPeriod: period === "7d" ? 1 : period === "90d" ? 4 : 4,
      };
      return {
        ok: true,
        json: async () => payload,
      } as Response;
    });
  });

  it("renders total companies, active leads, won deals, and pipeline value with en-US number formatting", async () => {
    renderDashboard();

    const root = kpiRoot();
    await waitFor(() => {
      expect(within(root).getByText("Total companies")).toBeInTheDocument();
    });

    const totalValue = initialKpisFixture.totalValue;
    const pipelineLabel = `€${totalValue.toLocaleString("en-US")}`;

    const companiesCard = within(root).getByText("Total companies").closest('[data-slot="card"]');
    if (companiesCard === null) {
      throw new Error("expected companies StatCard root");
    }
    expect(within(companiesCard as HTMLElement).getByText("4")).toBeInTheDocument();

    const leadsCard = within(root).getByText("Active leads").closest('[data-slot="card"]');
    if (leadsCard === null) {
      throw new Error("expected leads StatCard root");
    }
    expect(within(leadsCard as HTMLElement).getByText("2")).toBeInTheDocument();

    const wonCard = within(root).getByText("Won deals").closest('[data-slot="card"]');
    if (wonCard === null) {
      throw new Error("expected won StatCard root");
    }
    expect(within(wonCard as HTMLElement).getByText("1")).toBeInTheDocument();

    const pipelineCard = within(root).getByText("Total pipeline value").closest('[data-slot="card"]');
    if (pipelineCard === null) {
      throw new Error("expected pipeline StatCard root");
    }
    expect(within(pipelineCard as HTMLElement).getByText(pipelineLabel)).toBeInTheDocument();
  });

  it("shows period change subtitle for the first three KPI cards", async () => {
    renderDashboard();

    const root = kpiRoot();
    await waitFor(() => {
      expect(within(root).getAllByText(/\+[0-9]+ this period/).length).toBeGreaterThanOrEqual(3);
    });

    expect(within(root).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty KPI payload with zero values and €0 pipeline", async () => {
    renderDashboard(emptyKpis);

    const root = kpiRoot();
    await waitFor(() => expect(within(root).getByText("Total companies")).toBeInTheDocument());

    expect(within(root).getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(within(root).getByText("€0")).toBeInTheDocument();
  });

  it("shows Suspense fallback while a period refetch is in flight", async () => {
    let releaseGate: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("period=7d")) {
        await gate;
        return {
          ok: true,
          json: async () => ({ ...initialKpisFixture, period: "7d" as const, companiesInPeriod: 1 }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ ...initialKpisFixture, period: "30d" }),
      } as Response;
    });

    const user = userEvent.setup();
    renderDashboard();

    const root = kpiRoot();
    await waitFor(() => expect(within(root).getByText("Total companies")).toBeInTheDocument());

    const periodTrigger = getPeriodSelectTrigger(root);
    await user.click(periodTrigger);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Last 7 days/i })).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole("option", { name: /Last 7 days/i }));
    });

    expect(screen.getByTestId("dashboard-suspense-fallback")).toBeInTheDocument();

    await act(async () => {
      if (releaseGate) {
        releaseGate();
      }
    });

    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-suspense-fallback")).not.toBeInTheDocument();
    });

    expect(within(kpiRoot()).getByText("Total companies")).toBeInTheDocument();
  });

  it("changes the period filter via the shadcn Select", async () => {
    const user = userEvent.setup();
    renderDashboard();

    const root = kpiRoot();
    await waitFor(() => expect(within(root).getByText("Total companies")).toBeInTheDocument());

    const periodTrigger = getPeriodSelectTrigger(root);
    expect(periodTrigger).toHaveTextContent("Last 30 days");

    await user.click(periodTrigger);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Last 7 days/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("option", { name: /Last 7 days/i }));
    await waitFor(() => expect(periodTrigger).toHaveTextContent("Last 7 days"));

    await user.click(periodTrigger);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Last 90 days/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("option", { name: /Last 90 days/i }));
    await waitFor(() => expect(periodTrigger).toHaveTextContent("Last 90 days"));
  });
});

describe("StatCard + data-format helpers (reminders / overdue style KPIs)", () => {
  it("uses safeDisplay for a null open-reminders style value", () => {
    const view = render(
      <StatCard title="Open reminders" value={safeDisplay(null)} icon={<Building className="h-5 w-5" aria-hidden />} />,
    );
    expect(within(view.container).getByText("Open reminders")).toBeInTheDocument();
    expect(within(view.container).getByText("—")).toBeInTheDocument();
  });

  it("uses safeDisplay for numeric string counts", () => {
    const view = render(
      <StatCard title="Overdue" value={safeDisplay(3)} icon={<Building className="h-5 w-5" aria-hidden />} />,
    );
    expect(within(view.container).getByText("Overdue")).toBeInTheDocument();
    expect(within(view.container).getByText("3")).toBeInTheDocument();
  });

  it("aligns pipeline-style formatting: dashboard uses locale toLocaleString; formatCurrency uses de-DE", () => {
    const v = 3845;
    const dashboardStyle = `€${v.toLocaleString("en-US")}`;
    const deStyle = formatCurrency(v);
    expect(dashboardStyle).toBe("€3,845");
    expect(deStyle).toBe(`€${v.toLocaleString("de-DE")}`);
    expect(formatCurrency(null)).toBe(formatCurrency(0));
  });
});
