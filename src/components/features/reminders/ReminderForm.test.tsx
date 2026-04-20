/**
 * Integration tests for {@link ../reminder/ReminderEditForm.tsx}: `useForm` + `zodResolver(reminderSchema)` from `@/lib/validations/reminder` and `toReminderInsert` / `toReminderUpdate`.
 * `ReminderCreateForm` uses a duplicate inline schema; this file targets the edit/create form that shares the canonical resolver and insert mapping.
 *
 * Mocks: `next/navigation` and a per-file `@/lib/supabase/browser` chain (companies/profiles queries + reminders insert). `sonner` toast.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  reminderFormSchema,
  reminderSchema,
  toReminderInsert,
} from "@/lib/validations/reminder";
import enMessages from "@/messages/en.json";
import ReminderEditForm from "../reminder/ReminderEditForm";

const { mockCreateClient, lastReminderInsert, COMPANY_ID } = vi.hoisted(() => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const lastReminderInsert: { payload: Record<string, unknown> | null } = { payload: null };
  const companiesRow = [{ id, firmenname: "Fixture GmbH" }];

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
            is: vi.fn(() =>
              Promise.resolve({
                data: companiesRow,
                error: null,
              }),
            ),
          })),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
        };
      }
      if (table === "reminders") {
        return {
          insert: vi.fn((rows: Record<string, unknown> | Record<string, unknown>[]) => {
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (row && typeof row === "object") {
              lastReminderInsert.payload = row as Record<string, unknown>;
            }
            return {
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: "11111111-1111-1111-1111-111111111111",
                      ...row,
                    },
                    error: null,
                  }),
                ),
              })),
            };
          }),
        };
      }
      return {
        select: vi.fn(() => ({
          is: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      };
    }),
  }));

  return { mockCreateClient, lastReminderInsert, COMPANY_ID: id };
});

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

function renderReminderForm(ui: ReactElement) {
  const Wrapper = createQueryWrapper();
  return render(ui, { wrapper: Wrapper });
}

function withinReminderForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) {
    throw new Error("Expected ReminderEditForm to render a <form> element");
  }
  return within(form);
}

async function waitForCompanyOption(form: HTMLFormElement, companyId: string) {
  await waitFor(() => {
    const opt = form.querySelector(`select[aria-hidden="true"] option[value="${companyId}"]`);
    expect(opt).toBeTruthy();
  });
}

afterEach(() => {
  cleanup();
});

describe("ReminderEditForm + reminderSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastReminderInsert.payload = null;
  });

  it("renders core labels and Create Reminder submit when no existing reminder", () => {
    const { container } = renderReminderForm(<ReminderEditForm user={{ id: "user-1" }} />);
    const view = withinReminderForm(container);
    expect(view.getByText("Title")).toBeInTheDocument();
    expect(view.getByText("Company")).toBeInTheDocument();
    expect(view.getByText("Due Date")).toBeInTheDocument();
    expect(view.getByRole("button", { name: /Create Reminder/i })).toBeInTheDocument();
  });

  it("submits valid data and inserts payload compatible with reminderSchema + toReminderInsert", async () => {
    const user = userEvent.setup();
    const { container } = renderReminderForm(<ReminderEditForm user={{ id: "user-1" }} />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected ReminderEditForm to render a <form> element");
    }
    const view = within(form);

    await waitFor(() => {
      expect(form.querySelectorAll("select[aria-hidden=\"true\"]").length).toBeGreaterThan(0);
    });
    await waitForCompanyOption(form, COMPANY_ID);

    await user.type(view.getByRole("textbox", { name: /Title/i }), "Quarterly check-in");

    const hiddenSelects = form.querySelectorAll("select[aria-hidden=\"true\"]");
    const companySelect = hiddenSelects[0];
    if (!(companySelect instanceof HTMLSelectElement)) {
      throw new Error("expected Radix hidden select for Company");
    }
    await user.selectOptions(companySelect, COMPANY_ID);

    await user.click(view.getByRole("button", { name: /Create Reminder/i }));

    await waitFor(() => {
      expect(lastReminderInsert.payload).not.toBeNull();
    });

    const payload = lastReminderInsert.payload;
    if (payload === null) {
      throw new Error("expected insert payload");
    }

    const { user_id: _uid, ...formShape } = payload;
    expect(_uid).toBe("user-1");

    const descRaw = formShape.description;
    const parsed = reminderSchema.parse({
      title: formShape.title,
      company_id: formShape.company_id,
      due_date: formShape.due_date,
      priority: formShape.priority,
      status: formShape.status,
      assigned_to: formShape.assigned_to,
      description:
        descRaw === null || descRaw === undefined
          ? undefined
          : typeof descRaw === "string"
            ? descRaw
            : undefined,
    });
    const insert = toReminderInsert(parsed);

    expect(insert.title).toBe("Quarterly check-in");
    expect(insert.company_id).toBe(COMPANY_ID);
    expect(typeof insert.due_date).toBe("string");
    expect(insert.description).toBeNull();
  });

  it("blocks submit when title is empty after selecting a company", async () => {
    const user = userEvent.setup();
    const { container } = renderReminderForm(<ReminderEditForm user={{ id: "user-1" }} />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected ReminderEditForm to render a <form> element");
    }
    const view = within(form);

    await waitFor(() => {
      expect(form.querySelectorAll("select[aria-hidden=\"true\"]").length).toBeGreaterThan(0);
    });
    await waitForCompanyOption(form, COMPANY_ID);

    const hiddenSelects = form.querySelectorAll("select[aria-hidden=\"true\"]");
    const companySelect = hiddenSelects[0];
    if (!(companySelect instanceof HTMLSelectElement)) {
      throw new Error("expected Radix hidden select for Company");
    }
    await user.selectOptions(companySelect, COMPANY_ID);

    await user.click(view.getByRole("button", { name: /Create Reminder/i }));

    await waitFor(() => {
      expect(view.getByText("Title is required")).toBeInTheDocument();
    });
    expect(lastReminderInsert.payload).toBeNull();
  });

  it("blocks submit when company is missing", async () => {
    const user = userEvent.setup();
    const { container } = renderReminderForm(<ReminderEditForm user={{ id: "user-1" }} />);
    const view = withinReminderForm(container);

    await user.type(view.getByRole("textbox", { name: /Title/i }), "Needs a company");
    await user.click(view.getByRole("button", { name: /Create Reminder/i }));

    await waitFor(() => {
      expect(view.getByText("Company is required")).toBeInTheDocument();
    });
    expect(lastReminderInsert.payload).toBeNull();
  });

  it("blocks submit when due date is in the past", async () => {
    const user = userEvent.setup();
    const { container } = renderReminderForm(<ReminderEditForm user={{ id: "user-1" }} />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected ReminderEditForm to render a <form> element");
    }
    const view = within(form);

    await waitFor(() => {
      expect(form.querySelectorAll("select[aria-hidden=\"true\"]").length).toBeGreaterThan(0);
    });
    await waitForCompanyOption(form, COMPANY_ID);

    await user.type(view.getByRole("textbox", { name: /Title/i }), "Past due task");

    const hiddenSelects = form.querySelectorAll("select[aria-hidden=\"true\"]");
    const companySelect = hiddenSelects[0];
    if (!(companySelect instanceof HTMLSelectElement)) {
      throw new Error("expected Radix hidden select for Company");
    }
    await user.selectOptions(companySelect, COMPANY_ID);

    const due = view.getByLabelText(/Due Date/i);
    await user.clear(due);
    await user.type(due, "2020-01-02T10:00");

    await user.click(view.getByRole("button", { name: /Create Reminder/i }));

    await waitFor(() => {
      expect(view.getByText("Due date must be in the future")).toBeInTheDocument();
    });
    expect(lastReminderInsert.payload).toBeNull();
  });

  it("maps empty description to null in inserted row via toReminderInsert", async () => {
    const user = userEvent.setup();
    const { container } = renderReminderForm(<ReminderEditForm user={{ id: "user-1" }} />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected ReminderEditForm to render a <form> element");
    }
    const view = within(form);

    await waitFor(() => {
      expect(form.querySelectorAll("select[aria-hidden=\"true\"]").length).toBeGreaterThan(0);
    });
    await waitForCompanyOption(form, COMPANY_ID);

    await user.type(view.getByRole("textbox", { name: /Title/i }), "No description");

    const hiddenSelects = form.querySelectorAll("select[aria-hidden=\"true\"]");
    const companySelect = hiddenSelects[0];
    if (!(companySelect instanceof HTMLSelectElement)) {
      throw new Error("expected Radix hidden select for Company");
    }
    await user.selectOptions(companySelect, COMPANY_ID);

    const desc = view.getByRole("textbox", { name: /Description/i });
    await user.clear(desc);

    await user.click(view.getByRole("button", { name: /Create Reminder/i }));

    await waitFor(() => {
      expect(lastReminderInsert.payload).not.toBeNull();
    });

    const payload = lastReminderInsert.payload;
    if (payload === null) {
      throw new Error("expected insert payload");
    }
    const descRaw = payload.description;
    const parsed = reminderSchema.parse({
      title: payload.title,
      company_id: payload.company_id,
      due_date: payload.due_date,
      priority: payload.priority,
      status: payload.status,
      assigned_to: payload.assigned_to,
      description:
        descRaw === null || descRaw === undefined
          ? undefined
          : typeof descRaw === "string"
            ? descRaw
            : undefined,
    });
    expect(toReminderInsert(parsed).description).toBeNull();
  });
});

describe("reminderFormSchema contract (strict, enums, future due date)", () => {
  const futureIso = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const base = {
    title: "Valid reminder title",
    company_id: COMPANY_ID,
    due_date: futureIso,
    priority: "normal" as const,
    status: "open" as const,
    assigned_to: null as null,
    description: null as null,
  };

  it("rejects unknown keys under .strict()", () => {
    const raw = { ...base, extra_field: "x" };
    const result = reminderFormSchema.safeParse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === "unrecognized_keys")).toBe(true);
    }
  });

  it("rejects title shorter than 3 characters after trim", () => {
    const result = reminderFormSchema.safeParse({ ...base, title: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid company_id UUID", () => {
    const result = reminderFormSchema.safeParse({ ...base, company_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority enum", () => {
    const result = reminderFormSchema.safeParse({ ...base, priority: "urgent" });
    expect(result.success).toBe(false);
  });

  it("rejects due_date in the past", () => {
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    expect(() =>
      reminderFormSchema.parse({
        ...base,
        due_date: past,
      }),
    ).toThrow();
  });
});
