/**
 * Regression tests for the "Löschen" confirmation dialog on the company-detail page.
 *
 * Guards against two historical bugs:
 *   1. LinkedContactsCard: trash button was a `console.log` stub that never deleted.
 *   2. TimelineCard / RemindersCard: used the native `window.confirm(...)` browser
 *      alert instead of the shadcn `AlertDialog`, producing an inconsistent UX.
 *
 * Every card on the company-detail page must:
 *   - open a shadcn `AlertDialog` (role="alertdialog") on trash click,
 *   - never invoke `window.confirm`,
 *   - call the matching soft-delete server action when the destructive action is clicked,
 *   - close the dialog and optimistically remove the row.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteContactWithTrash,
  deleteReminderWithTrash,
  deleteTimelineEntryWithTrash,
} from "@/lib/actions/crm-trash";
import deMessages from "@/messages/de.json";
import type { Contact, Reminder, TimelineEntryWithJoins } from "@/types/database.types";

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => `/companies/${COMPANY_ID}`,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: COMPANY_ID }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/actions/crm-trash", () => ({
  deleteContactWithTrash: vi.fn(async (_id: string) => "soft" as const),
  restoreContactWithTrash: vi.fn(async (_id: string) => undefined),
  deleteTimelineEntryWithTrash: vi.fn(async (_id: string) => "soft" as const),
  restoreTimelineEntryWithTrash: vi.fn(async (_id: string) => undefined),
  deleteReminderWithTrash: vi.fn(async (_id: string) => "soft" as const),
  restoreReminderWithTrash: vi.fn(async (_id: string) => undefined),
}));

vi.mock("@/lib/auth/get-current-user-client", () => ({
  getCurrentUserClient: vi.fn(async () => ({
    id: "user-1",
    email: "user@example.com",
    display_name: "Test User",
  })),
}));

/**
 * Chainable Supabase query-builder stub: every method returns the same builder
 * and the builder is itself a PromiseLike that resolves with `{ data, error }`.
 * This lets calls like `.from(t).select(...).eq(...).is(...).order(...)` settle.
 */
function makeQueryBuilder<T>(data: T[]) {
  const result = { data, error: null as Error | null };
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "is", "or", "and", "not", "in", "ilike", "like", "match", "filter",
    "order", "limit", "range", "single", "maybeSingle",
  ];
  const builder: Record<string, unknown> = {};
  for (const name of methods) {
    builder[name] = vi.fn(() => builder);
  }
  // biome-ignore lint/suspicious/noThenProperty: intentional thenable that mirrors Supabase's PromiseLike query builder.
  builder.then = (
    onF?: ((value: typeof result) => unknown) | null,
    onR?: ((reason: unknown) => unknown) | null,
  ) => Promise.resolve(result).then(onF as never, onR as never);
  builder.catch = (onR?: ((reason: unknown) => unknown) | null) =>
    Promise.resolve(result).catch(onR as never);
  builder.finally = (onF?: (() => void) | null) =>
    Promise.resolve(result).finally(onF as never);
  return builder;
}

const tables: Record<string, unknown[]> = {};

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "user@example.com" } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn((table: string) => makeQueryBuilder(tables[table] ?? [])),
  }),
}));

function mockContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    anrede: null,
    vorname: "Max",
    nachname: "Mustermann",
    email: "max@example.com",
    telefon: null,
    mobil: null,
    durchwahl: null,
    position: null,
    is_primary: false,
    company_id: COMPANY_ID,
    notes: null,
    user_id: null,
    created_at: null,
    updated_at: null,
    created_by: null,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    search_vector: null,
    ...overrides,
  };
}

function mockTimelineEntry(overrides: Partial<TimelineEntryWithJoins> = {}): TimelineEntryWithJoins {
  return {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    activity_type: "note",
    title: "Call notes",
    content: null,
    company_id: COMPANY_ID,
    contact_id: null,
    user_id: "user-1",
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: null,
    created_by: "user-1",
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    companies: { firmenname: "Fixture GmbH" },
    contacts: null,
    profiles: { display_name: "Test User" },
    ...overrides,
  } as TimelineEntryWithJoins;
}

function mockReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    title: "Call Marina back",
    description: null,
    due_date: "2026-04-20",
    priority: "normal",
    status: "open",
    company_id: COMPANY_ID,
    contact_id: null,
    assigned_to: "user-1",
    user_id: "user-1",
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: null,
    created_by: "user-1",
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  } as Reminder;
}

function createWrapper(seed: (client: QueryClient) => void) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  });
  seed(client);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <QueryClientProvider client={client}>
          <Suspense fallback={<div>loading…</div>}>{children}</Suspense>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(tables)) delete tables[key];
});

afterEach(() => {
  cleanup();
});

describe("LinkedContactsCard delete dialog", () => {
  it("shows a shadcn AlertDialog (not native confirm), calls deleteContactWithTrash, and removes the row", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);

    const contact = mockContact({ vorname: "Anna", nachname: "Schmidt" });
    tables.contacts = [contact];

    vi.mocked(deleteContactWithTrash).mockImplementation(async (id: string) => {
      tables.contacts = (tables.contacts as Contact[]).filter((c) => c.id !== id);
      return "soft" as const;
    });

    const Wrapper = createWrapper((client) => {
      client.setQueryData(["contacts", COMPANY_ID], [contact]);
    });

    const { default: LinkedContactsCard } = await import("../LinkedContactsCard");

    render(<LinkedContactsCard companyId={COMPANY_ID} />, { wrapper: Wrapper });

    const row = await screen.findByRole("row", { name: /Anna Schmidt/ });
    const trashButton = within(row).getAllByRole("button").at(-1);
    if (!trashButton) throw new Error("expected trash button");

    await user.click(trashButton);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(deMessages.contacts.tableDeleteConfirmTitle)).toBeInTheDocument();
    expect(within(dialog).getByText(deMessages.contacts.tableDeleteConfirmDescription)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: deMessages.contacts.delete }));

    await waitFor(() => {
      expect(vi.mocked(deleteContactWithTrash)).toHaveBeenCalledWith(contact.id);
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("row", { name: /Anna Schmidt/ })).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it("does NOT call deleteContactWithTrash when the dialog is cancelled", async () => {
    const user = userEvent.setup();

    const contact = mockContact({ vorname: "Bea", nachname: "Becker" });
    tables.contacts = [contact];

    const Wrapper = createWrapper((client) => {
      client.setQueryData(["contacts", COMPANY_ID], [contact]);
    });

    const { default: LinkedContactsCard } = await import("../LinkedContactsCard");

    render(<LinkedContactsCard companyId={COMPANY_ID} />, { wrapper: Wrapper });

    const row = await screen.findByRole("row", { name: /Bea Becker/ });
    const trashButton = within(row).getAllByRole("button").at(-1);
    if (!trashButton) throw new Error("expected trash button");
    await user.click(trashButton);

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: deMessages.contacts.cancel }));

    expect(vi.mocked(deleteContactWithTrash)).not.toHaveBeenCalled();
    expect(screen.getByRole("row", { name: /Bea Becker/ })).toBeInTheDocument();
  });
});

describe("TimelineCard delete dialog", () => {
  it("shows a shadcn AlertDialog (not native confirm) and calls deleteTimelineEntryWithTrash", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);

    const entry = mockTimelineEntry({ title: "Important call note" });
    tables.timeline = [entry];
    tables.companies = [];
    tables.contacts = [];
    tables.profiles = [];

    const Wrapper = createWrapper((client) => {
      client.setQueryData(["timeline", COMPANY_ID], [entry]);
      client.setQueryData(["companies"], []);
      client.setQueryData(["contacts"], []);
      client.setQueryData(["profiles"], []);
      client.setQueryData(["user"], { id: "user-1" });
    });

    const { default: TimelineCard } = await import("../TimelineCard");

    render(<TimelineCard companyId={COMPANY_ID} />, { wrapper: Wrapper });

    const titleCell = await screen.findByText("Important call note");
    const row = titleCell.closest("tr");
    if (!row) throw new Error("expected table row");
    const trashButton = within(row as HTMLElement).getAllByRole("button").at(-1);
    if (!trashButton) throw new Error("expected trash button");

    await user.click(trashButton);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(deMessages.timeline.deleteConfirmTitle)).toBeInTheDocument();
    expect(within(dialog).getByText(deMessages.timeline.deleteConfirmDescription)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: deMessages.timeline.deleteConfirmAction }));

    await waitFor(() => {
      expect(vi.mocked(deleteTimelineEntryWithTrash)).toHaveBeenCalledWith(entry.id);
    });
    expect(confirmSpy).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});

describe("RemindersCard delete dialog", () => {
  it("shows a shadcn AlertDialog (not native confirm) and calls deleteReminderWithTrash", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);

    const reminder = mockReminder({ title: "Follow up tomorrow" });
    tables.reminders = [reminder];
    tables.profiles = [{ id: "user-1", display_name: "Test User" }];

    const Wrapper = createWrapper((client) => {
      client.setQueryData(["user"], { id: "user-1", email: "user@example.com" });
      client.setQueryData(["profiles"], [{ id: "user-1", display_name: "Test User" }]);
      client.setQueryData(["reminders", COMPANY_ID], [reminder]);
    });

    const { default: RemindersCard } = await import("../RemindersCard");

    render(<RemindersCard companyId={COMPANY_ID} />, { wrapper: Wrapper });

    const titleButton = await screen.findByRole("button", { name: "Follow up tomorrow" });
    const row = titleButton.closest("tr");
    if (!row) throw new Error("expected table row");
    const trashButton = within(row as HTMLElement).getAllByRole("button").at(-1);
    if (!trashButton) throw new Error("expected trash button");

    await user.click(trashButton);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(deMessages.reminders.deleteTitle)).toBeInTheDocument();
    expect(within(dialog).getByText(deMessages.reminders.deleteDescription)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: deMessages.reminders.delete }));

    await waitFor(() => {
      expect(vi.mocked(deleteReminderWithTrash)).toHaveBeenCalledWith(reminder.id);
    });
    expect(confirmSpy).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
