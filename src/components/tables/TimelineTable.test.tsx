/**
 * Behavior tests for {@link ./TimelineTable.tsx}: delete flows and `TIMELINE_DELETE_NO_ACTIVE_ROW` toast copy.
 *
 * Mocks: `crm-trash` server actions, `sonner`, `@/lib/supabase/browser` (companies/contacts for edit form queries).
 * `next/navigation` is mocked in {@link ../../test/setup.ts}.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMELINE_DELETE_NO_ACTIVE_ROW } from "@/lib/constants/timeline-delete";
import enMessages from "@/messages/en.json";
import type { TimelineEntryWithJoins } from "@/types/database.types";
import TimelineTable from "./TimelineTable";

const { mockDeleteTimeline, mockRestoreTimeline } = vi.hoisted(() => ({
  mockDeleteTimeline: vi.fn(),
  mockRestoreTimeline: vi.fn(),
}));

vi.mock("@/lib/actions/crm-trash", () => ({
  deleteTimelineEntryWithTrash: mockDeleteTimeline,
  restoreTimelineEntryWithTrash: mockRestoreTimeline,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { mockCreateClient } = vi.hoisted(() => {
  const mockCreateClient = vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "companies") {
        return {
          select: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      }
      if (table === "contacts") {
        return {
          select: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          is: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      };
    }),
  }));
  return { mockCreateClient };
});

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const ENTRY_ID = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";

function mockTimelineEntry(overrides: Partial<TimelineEntryWithJoins> = {}): TimelineEntryWithJoins {
  return {
    id: ENTRY_ID,
    title: "Fixture timeline title",
    content: null,
    activity_type: "note",
    company_id: null,
    contact_id: null,
    created_at: "2024-06-01T12:00:00.000Z",
    created_by: null,
    updated_by: null,
    user_id: null,
    user_name: null,
    deleted_at: null,
    deleted_by: null,
    companies: null,
    contacts: null,
    profiles: { display_name: "Fixture User" },
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
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderTimelineTable(ui: ReactElement) {
  const QueryWrapper = createQueryWrapper();
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <QueryWrapper>{ui}</QueryWrapper>
    </NextIntlClientProvider>,
  );
}

/** Second button in the row actions cell (delete trigger); narrows under `noUncheckedIndexedAccess`. */
function deleteTriggerFromRow(row: HTMLElement): HTMLElement {
  const buttons = within(row).getAllByRole("button");
  const trigger = buttons[1];
  if (trigger === undefined) {
    throw new Error("Expected timeline row to include edit and delete action buttons");
  }
  return trigger;
}

const mockedToast = vi.mocked(toast);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockDeleteTimeline.mockReset();
  mockRestoreTimeline.mockReset();
});

describe("TimelineTable", () => {
  it("renders a row with title and actions", () => {
    renderTimelineTable(<TimelineTable data={[mockTimelineEntry()]} isLoading={false} />);
    expect(screen.getByText("Fixture timeline title")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /actions/i })).toBeInTheDocument();
  });

  it("shows generic delete error toast when delete fails for other reasons", async () => {
    const user = userEvent.setup();
    mockDeleteTimeline.mockRejectedValueOnce(new Error("Supabase unavailable"));

    renderTimelineTable(<TimelineTable data={[mockTimelineEntry()]} isLoading={false} />);

    const row = screen.getByRole("row", { name: /Fixture timeline title/i });
    await user.click(deleteTriggerFromRow(row));

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockedToast.error).toHaveBeenCalledWith(enMessages.timeline.toastDeleteFailed);
  });

  it("shows already-trashed explanatory toast when delete fails with TIMELINE_DELETE_NO_ACTIVE_ROW", async () => {
    const user = userEvent.setup();
    mockDeleteTimeline.mockRejectedValueOnce(new Error(TIMELINE_DELETE_NO_ACTIVE_ROW));

    renderTimelineTable(<TimelineTable data={[mockTimelineEntry()]} isLoading={false} />);

    const row = screen.getByRole("row", { name: /Fixture timeline title/i });
    await user.click(deleteTriggerFromRow(row));

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockedToast.error).toHaveBeenCalledWith(enMessages.timeline.toastDeleteAlreadyTrashedTitle, {
      description: enMessages.timeline.toastDeleteAlreadyTrashedDescription,
    });
  });

  it("shows soft-delete success toast with undo when trash bin is on", async () => {
    const user = userEvent.setup();
    mockDeleteTimeline.mockResolvedValueOnce("soft");

    renderTimelineTable(<TimelineTable data={[mockTimelineEntry()]} isLoading={false} />);

    const row = screen.getByRole("row", { name: /Fixture timeline title/i });
    await user.click(deleteTriggerFromRow(row));

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockedToast.success).toHaveBeenCalledWith(
      enMessages.timeline.toastDeleted,
      expect.objectContaining({
        action: expect.objectContaining({ label: "Rückgängig" }),
      }),
    );
  });

  it("shows hard-delete success toast when trash bin is off", async () => {
    const user = userEvent.setup();
    mockDeleteTimeline.mockResolvedValueOnce("hard");

    renderTimelineTable(<TimelineTable data={[mockTimelineEntry()]} isLoading={false} />);

    const row = screen.getByRole("row", { name: /Fixture timeline title/i });
    await user.click(deleteTriggerFromRow(row));

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockedToast.success).toHaveBeenCalledWith(enMessages.timeline.toastDeleted);
  });
});
