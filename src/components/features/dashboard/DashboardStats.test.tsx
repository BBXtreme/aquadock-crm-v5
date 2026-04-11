/**
 * Dashboard KPI / statistics: {@link ../../../app/(protected)/dashboard/DashboardClient.tsx} (StatCard row + period filter).
 * The CRM dashboard shows companies, active leads, won deals, and pipeline value (€ + locale). Contacts/timeline feed the query but are not separate KPI tiles yet.
 * Extended patterns for reminders / overdue use {@link ../../../components/ui/StatCard.tsx} with {@link ../../../lib/utils/data-format.ts}.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Building } from "lucide-react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardClient from "@/app/(protected)/dashboard/DashboardClient";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/browser";
import { formatCurrency, safeDisplay } from "@/lib/utils/data-format";

vi.mock("@/lib/supabase/browser", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/i18n/use-translations", () => ({
  useT: () => dashboardTranslator,
  useNumberLocaleTag: () => "en-US",
}));

const mockedCreateClient = vi.mocked(createClient);

const recentIso = new Date().toISOString();

const companiesFixture = [
  { status: "lead", value: 1_000, created_at: recentIso },
  { status: "lead", value: 2_345, created_at: recentIso },
  { status: "gewonnen", value: 500, created_at: recentIso },
  { status: "kunde", value: null, created_at: recentIso },
];

const contactsFixture = [{ created_at: recentIso }, { created_at: recentIso }, { created_at: recentIso }];

const timelineFixture = [{ created_at: recentIso }, { created_at: recentIso }];

function tableData(table: string): unknown[] {
  if (table === "companies") {
    return companiesFixture;
  }
  if (table === "contacts") {
    return contactsFixture;
  }
  if (table === "timeline") {
    return timelineFixture;
  }
  return [];
}

function supabaseClientFromData(): ReturnType<typeof createClient> {
  return {
    from: (table: string) => ({
      select: () => ({
        is: async () => ({ data: tableData(table), error: null }),
      }),
    }),
  } as unknown as ReturnType<typeof createClient>;
}

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

function renderDashboard() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <div data-testid="dashboard-kpi-root">
        <Suspense fallback={<div data-testid="dashboard-suspense-fallback">Loading dashboard…</div>}>
          <DashboardClient />
        </Suspense>
      </div>
    </QueryClientProvider>,
  );
}

function kpiRoot(): HTMLElement {
  const el = screen.getByTestId("dashboard-kpi-root");
  return el;
}

function getPeriodSelect(container: HTMLElement): HTMLSelectElement {
  const candidates = [...container.querySelectorAll("select")];
  const found = candidates.find(
    (s) => s.querySelector('option[value="7d"]') && s.querySelector('option[value="30d"]'),
  );
  if (found === undefined || !(found instanceof HTMLSelectElement)) {
    throw new Error("expected dashboard period <select> with 7d/30d options");
  }
  return found;
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
    globalThis.ResizeObserver = TestResizeObserver;
    mockedCreateClient.mockImplementation(() => supabaseClientFromData());
  });

  it("renders total companies, active leads, won deals, and pipeline value with en-US number formatting", async () => {
    renderDashboard();

    const root = kpiRoot();
    await waitFor(() => {
      expect(within(root).getByText("Total companies")).toBeInTheDocument();
    });

    const totalValue = companiesFixture.reduce((sum, c) => sum + (c.value ?? 0), 0);
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

  it("handles empty Supabase rows with zero KPI values and €0 pipeline", async () => {
    mockedCreateClient.mockImplementation(
      () =>
        ({
          from: () => ({
            select: () => ({
              is: async () => ({ data: [], error: null }),
            }),
          }),
        }) as unknown as ReturnType<typeof createClient>,
    );

    renderDashboard();

    const root = kpiRoot();
    await waitFor(() => expect(within(root).getByText("Total companies")).toBeInTheDocument());

    expect(within(root).getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(within(root).getByText("€0")).toBeInTheDocument();
  });

  it("shows Suspense fallback until the stats query resolves", async () => {
    let releaseGate: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });

    mockedCreateClient.mockImplementation(
      () =>
        ({
          from: (table: string) => ({
            select: () => ({
              is: async () => {
                await gate;
                return { data: tableData(table), error: null };
              },
            }),
          }),
        }) as unknown as ReturnType<typeof createClient>,
    );

    renderDashboard();

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

  it("changes the period filter via the native select", async () => {
    const user = userEvent.setup();
    renderDashboard();

    const root = kpiRoot();
    await waitFor(() => expect(within(root).getByText("Total companies")).toBeInTheDocument());

    const periodSelect = getPeriodSelect(root);
    expect(periodSelect).toHaveValue("30d");

    await user.selectOptions(periodSelect, "7d");
    await waitFor(() => expect(periodSelect).toHaveValue("7d"));

    await user.selectOptions(periodSelect, "90d");
    await waitFor(() => expect(periodSelect).toHaveValue("90d"));
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
