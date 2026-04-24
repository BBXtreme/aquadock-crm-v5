/**
 * Smoke + submit tests for {@link ./TimelineEntryForm.tsx}.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import TimelineEntryForm from "./TimelineEntryForm";

function wrap(ui: ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("TimelineEntryForm", () => {
  it("renders and submits minimal values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      wrap(
        <TimelineEntryForm
          companies={[{ id: "c1", firmenname: "ACME" }]}
          contacts={[{ id: "p1", vorname: "Max", nachname: "M" }]}
          isSubmitting={false}
          onSubmit={onSubmit}
        />,
      ),
    );

    const titleInput = screen.getByPlaceholderText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Follow up");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload?.title).toBe("Follow up");
  });

  it("submits company_id and contact_id when chosen in comboboxes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const companyId = "550e8400-e29b-41d4-a716-446655440001";
    const contactId = "550e8400-e29b-41d4-a716-446655440002";

    render(
      wrap(
        <TimelineEntryForm
          companies={[{ id: companyId, firmenname: "ACME" }]}
          contacts={[{ id: contactId, vorname: "Max", nachname: "Muster" }]}
          isSubmitting={false}
          onSubmit={onSubmit}
        />,
      ),
    );

    await user.type(screen.getByPlaceholderText(/title/i), "Linked activity");

    await user.click(screen.getByRole("button", { name: /No company selected/i }));
    await screen.findByPlaceholderText(/Search companies/i);
    await user.click(screen.getByRole("option", { name: "ACME" }));

    await user.click(screen.getByRole("button", { name: /No contact selected/i }));
    await screen.findByPlaceholderText(/Search contacts/i);
    await user.click(screen.getByRole("option", { name: /Max Muster/i }));

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload?.company_id).toBe(companyId);
    expect(payload?.contact_id).toBe(contactId);
  });

  it("calls onCancel when provided", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      wrap(
        <TimelineEntryForm
          companies={[]}
          contacts={[]}
          isSubmitting={false}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          onCancel={onCancel}
        />,
      ),
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
