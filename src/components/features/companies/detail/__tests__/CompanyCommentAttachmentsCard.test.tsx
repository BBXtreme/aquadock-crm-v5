import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CompanyCommentAttachmentsCard from "@/components/features/companies/detail/CompanyCommentAttachmentsCard";
import deMessages from "@/messages/de.json";

const listCompanyCommentAttachments = vi.fn();
const getCommentAttachmentSignedUrl = vi.fn();
const getCurrentUserClient = vi.fn();
const routerReplaceMock = vi.fn();

vi.mock("@/lib/actions/comments", () => ({
  listCompanyCommentAttachments: (...args: unknown[]) => listCompanyCommentAttachments(...args),
  getCommentAttachmentSignedUrl: (...args: unknown[]) => getCommentAttachmentSignedUrl(...args),
}));

vi.mock("@/lib/auth/get-current-user-client", () => ({
  getCurrentUserClient: () => getCurrentUserClient(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
    push: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/companies/00000000-0000-4000-8000-aaaaaaaaaaaa",
  useSearchParams: () => new URLSearchParams("extra=1"),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

const mockUserRow = {
  id: "00000000-0000-4000-8000-000000000099",
  email: "t@test.de",
  user_metadata: {},
  role: "user" as const,
  display_name: "Tester",
  avatar_url: null,
};

function wrapper(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  client.setQueryData(["user"], mockUserRow);
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="de" messages={deMessages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe("CompanyCommentAttachmentsCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    listCompanyCommentAttachments.mockReset();
    getCommentAttachmentSignedUrl.mockReset();
    getCommentAttachmentSignedUrl.mockResolvedValue({ signedUrl: "https://signed.example/doc.pdf" });
    getCurrentUserClient.mockReset();
    getCurrentUserClient.mockResolvedValue(mockUserRow);
    routerReplaceMock.mockReset();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("lists attachments and shows empty state when none", async () => {
    listCompanyCommentAttachments.mockResolvedValue([]);
    render(wrapper(<CompanyCommentAttachmentsCard companyId="00000000-0000-4000-8000-aaaaaaaaaaaa" />));

    expect(screen.getByText(/Alle Dateien aus Notizen/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Es sind noch keine Dateien/i)).toBeInTheDocument();
    });
  });

  it("opens a signed URL when clicking the file name", async () => {
    const companyId = "00000000-0000-4000-8000-bbbbbbbbbbbb";
    const attachmentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const commentId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

    listCompanyCommentAttachments.mockResolvedValue([
      {
        id: attachmentId,
        comment_id: commentId,
        file_name: "Quarter.pdf",
        byte_size: 4096,
        content_type: "application/pdf",
        storage_object_path: `${companyId}/${commentId}/x_quarter.pdf`,
        created_at: "2024-06-01T08:00:00.000Z",
        created_by: mockUserRow.id,
        comments: {
          id: commentId,
          body_markdown: "Q2 review note body",
          entity_id: companyId,
          entity_type: "company",
          deleted_at: null,
          created_at: "2024-06-01T07:00:00.000Z",
        },
      },
    ]);

    const user = userEvent.setup();
    render(wrapper(<CompanyCommentAttachmentsCard companyId={companyId} />));

    await screen.findByRole("button", { name: /Quarter.pdf/i });

    await user.click(screen.getByRole("button", { name: /Quarter.pdf/i }));

    await waitFor(() => {
      expect(getCommentAttachmentSignedUrl).toHaveBeenCalledWith({ attachmentId });
    });
    expect(window.open).toHaveBeenCalledWith(
      "https://signed.example/doc.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("navigates to comment via router replace with commentId", async () => {
    const companyId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const commentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const attachmentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

    listCompanyCommentAttachments.mockResolvedValue([
      {
        id: attachmentId,
        comment_id: commentId,
        file_name: "Brief.pdf",
        byte_size: 100,
        content_type: "application/pdf",
        storage_object_path: `${companyId}/${commentId}/f_b.pdf`,
        created_at: "2024-06-02T09:00:00.000Z",
        created_by: mockUserRow.id,
        comments: {
          id: commentId,
          body_markdown: "Important",
          entity_id: companyId,
          entity_type: "company",
          deleted_at: null,
          created_at: "2024-06-02T09:00:00.000Z",
        },
      },
    ]);

    const user = userEvent.setup();
    render(wrapper(<CompanyCommentAttachmentsCard companyId={companyId} />));

    await screen.findByRole("button", { name: /Zur Notiz/i });

    vi.spyOn(document, "getElementById").mockReturnValue({
      scrollIntoView: vi.fn(),
    } as unknown as HTMLElement);

    await user.click(screen.getByRole("button", { name: /Zur Notiz/i }));

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalled();
    });
    const arg = routerReplaceMock.mock.calls[0]?.[0];
    expect(typeof arg).toBe("string");
    expect(arg).toBe(
      `/companies/00000000-0000-4000-8000-aaaaaaaaaaaa?extra=1&commentId=${encodeURIComponent(commentId)}`,
    );
  });
});
