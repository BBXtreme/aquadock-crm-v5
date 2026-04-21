import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompanyCommentsCard from "@/components/company-detail/CompanyCommentsCard";
import deMessages from "@/messages/de.json";

const listCompanyComments = vi.fn();
const createCompanyComment = vi.fn();
const getCurrentUserClient = vi.fn();

vi.mock("@/lib/actions/comments", () => ({
  listCompanyComments: (...args: unknown[]) => listCompanyComments(...args),
  createCompanyComment: (...args: unknown[]) => createCompanyComment(...args),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user-client", () => ({
  getCurrentUserClient: () => getCurrentUserClient(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function wrapper(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="de" messages={deMessages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe("CompanyCommentsCard", () => {
  beforeEach(() => {
    listCompanyComments.mockReset();
    createCompanyComment.mockReset();
    getCurrentUserClient.mockReset();
    getCurrentUserClient.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000099",
      email: "t@test.de",
      user_metadata: {},
      role: "user" as const,
      display_name: "Tester",
      avatar_url: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when there are no comments", async () => {
    listCompanyComments.mockResolvedValue([]);
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await waitFor(() => {
      expect(screen.getByText(/Noch keine Kommentare/i)).toBeInTheDocument();
    });
  });

  it("submits a new comment via server action", async () => {
    listCompanyComments.mockResolvedValue([]);
    createCompanyComment.mockResolvedValue({
      id: "c-new",
      entity_type: "company",
      entity_id: "00000000-0000-4000-8000-000000000001",
      parent_id: null,
      body_markdown: "Hello",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "00000000-0000-4000-8000-000000000099",
      updated_by: "00000000-0000-4000-8000-000000000099",
      deleted_at: null,
      deleted_by: null,
      profiles: { display_name: "Tester", avatar_url: null },
    });

    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));

    await waitFor(() => {
      const areas = screen.getAllByTestId("company-comment-composer-body");
      expect(areas.length).toBeGreaterThanOrEqual(1);
    });

    const composerBodies = screen.getAllByTestId("company-comment-composer-body");
    const composerBody = composerBodies[0];
    if (!composerBody) {
      throw new Error("Expected at least one comment composer textarea");
    }
    await user.type(composerBody, "Hello");
    const submitButtons = screen.getAllByRole("button", { name: /Kommentieren/i });
    const enabledSubmit = submitButtons.find((b) => !b.hasAttribute("disabled"));
    expect(enabledSubmit).toBeTruthy();
    if (enabledSubmit) {
      await user.click(enabledSubmit);
    }

    await waitFor(() => {
      expect(createCompanyComment).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "00000000-0000-4000-8000-000000000001",
          bodyMarkdown: "Hello",
          parentId: null,
        }),
      );
    });
  });
});
