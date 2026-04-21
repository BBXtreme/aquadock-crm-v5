import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompanyCommentsCard from "@/components/company-detail/CompanyCommentsCard";
import deMessages from "@/messages/de.json";

const listCompanyComments = vi.fn();
const createCompanyComment = vi.fn();
const updateComment = vi.fn();
const deleteComment = vi.fn();
const restoreOwnComment = vi.fn();
const getCurrentUserClient = vi.fn();

vi.mock("@/lib/actions/comments", () => ({
  listCompanyComments: (...args: unknown[]) => listCompanyComments(...args),
  createCompanyComment: (...args: unknown[]) => createCompanyComment(...args),
  updateComment: (...args: unknown[]) => updateComment(...args),
  deleteComment: (...args: unknown[]) => deleteComment(...args),
  restoreOwnComment: (...args: unknown[]) => restoreOwnComment(...args),
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
  /** Avoid disabled composer on first paint while `getCurrentUserClient` resolves (localStorage draft tests). */
  client.setQueryData(["user"], mockUserRow);
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="de" messages={deMessages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function wrapperNoSession(ui: ReactElement) {
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

function mkComment(
  id: string,
  body: string,
  parentId: string | null,
  createdAt: string,
) {
  return {
    id,
    entity_type: "company" as const,
    entity_id: "00000000-0000-4000-8000-000000000001",
    parent_id: parentId,
    body_markdown: body,
    created_at: createdAt,
    updated_at: createdAt,
    created_by: mockUserRow.id,
    updated_by: mockUserRow.id,
    deleted_at: null,
    deleted_by: null,
    profiles: { display_name: "Tester", avatar_url: null },
  };
}

describe("CompanyCommentsCard", () => {
  beforeEach(() => {
    localStorage.clear();
    listCompanyComments.mockReset();
    createCompanyComment.mockReset();
    updateComment.mockReset();
    deleteComment.mockReset();
    restoreOwnComment.mockReset();
    getCurrentUserClient.mockReset();
    getCurrentUserClient.mockResolvedValue(mockUserRow);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      (cb as (t: number) => void)(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows empty state when there are no comments", async () => {
    listCompanyComments.mockResolvedValue([]);
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await waitFor(() => {
      expect(screen.getByText(/Starte die Konversation/i)).toBeInTheDocument();
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

  it("shows template chip list when thread already has comments", async () => {
    listCompanyComments.mockResolvedValue([
      {
        id: "c-existing",
        entity_type: "company",
        entity_id: "00000000-0000-4000-8000-000000000001",
        parent_id: null,
        body_markdown: "Existing",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "00000000-0000-4000-8000-000000000099",
        updated_by: "00000000-0000-4000-8000-000000000099",
        deleted_at: null,
        deleted_by: null,
        profiles: { display_name: "Tester", avatar_url: null },
      },
    ]);

    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));

    await waitFor(() => {
      expect(screen.getByText("Existing")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("list", { name: /Typische Notizen/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Gesprächsnotiz/i })[0]).toBeInTheDocument();
  });

  it("seeds composer from template chip when thread is non-empty", async () => {
    listCompanyComments.mockResolvedValue([
      {
        id: "c-existing",
        entity_type: "company",
        entity_id: "00000000-0000-4000-8000-000000000001",
        parent_id: null,
        body_markdown: "Existing",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "00000000-0000-4000-8000-000000000099",
        updated_by: "00000000-0000-4000-8000-000000000099",
        deleted_at: null,
        deleted_by: null,
        profiles: { display_name: "Tester", avatar_url: null },
      },
    ]);

    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Gesprächsnotiz/i }).length).toBeGreaterThan(0);
    });
    const templateButtons = screen.getAllByRole("button", { name: /Gesprächsnotiz/i });
    const chip = templateButtons[0];
    if (!chip) {
      throw new Error("Expected template chip button");
    }
    await user.click(chip);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/## Gesprächsnotiz/)).toBeInTheDocument();
    });
  });

  it("persists composer draft to localStorage per company", async () => {
    const companyId = "00000000-0000-4000-8000-0000000000A1";
    listCompanyComments.mockResolvedValue([]);

    render(wrapper(<CompanyCommentsCard companyId={companyId} />));

    const composerBodies = screen.getAllByTestId("company-comment-composer-body");
    const composerBody = composerBodies[0];
    if (!composerBody) {
      throw new Error("Expected comment composer textarea");
    }
    expect(composerBody).not.toBeDisabled();

    fireEvent.change(composerBody, { target: { value: "Autosave me" } });

    await waitFor(() => {
      expect(localStorage.getItem(`comment-draft:company:${companyId}`)).toBe("Autosave me");
    });
  });

  it("hydrates composer draft from localStorage on mount", async () => {
    const companyId = "00000000-0000-4000-8000-0000000000A2";
    localStorage.setItem(`comment-draft:company:${companyId}`, "From storage");
    listCompanyComments.mockResolvedValue([]);

    render(wrapper(<CompanyCommentsCard companyId={companyId} />));

    expect(await screen.findByDisplayValue("From storage")).toBeInTheDocument();
  });

  it("shows new comment in list after successful submit (empty thread)", async () => {
    const savedRow = {
      id: "c-new",
      entity_type: "company" as const,
      entity_id: "00000000-0000-4000-8000-000000000001",
      parent_id: null,
      body_markdown: "Fresh",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "00000000-0000-4000-8000-000000000099",
      updated_by: "00000000-0000-4000-8000-000000000099",
      deleted_at: null,
      deleted_by: null,
      profiles: { display_name: "Tester", avatar_url: null },
    };
    listCompanyComments.mockImplementation(async () => {
      if (createCompanyComment.mock.calls.length === 0) {
        return [];
      }
      return [savedRow];
    });
    createCompanyComment.mockResolvedValue(savedRow);

    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));

    const composerBodies = screen.getAllByTestId("company-comment-composer-body");
    await waitFor(() => {
      expect(composerBodies[0]).toBeInTheDocument();
    });

    const composerBody = composerBodies[0];
    if (!composerBody) {
      throw new Error("Expected comment composer textarea");
    }
    await user.type(composerBody, "Fresh");
    const submit = screen.getAllByRole("button", { name: /Kommentieren/i }).find((b) => !b.hasAttribute("disabled"));
    expect(submit).toBeTruthy();
    if (submit) {
      await user.click(submit);
    }

    await waitFor(() => {
      expect(screen.getByText("Fresh")).toBeInTheDocument();
    });
  });

  it("shows loading skeleton while comments query is pending", async () => {
    listCompanyComments.mockReturnValue(
      new Promise(() => {
        /* Intentionally unresolved — keeps the comments query pending for this test. */
      }),
    );
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await waitFor(() => {
      expect(document.querySelector('[data-slot="skeleton"]')).toBeTruthy();
    });
  });

  it("shows load error for Error and non-Error failures", async () => {
    listCompanyComments.mockRejectedValueOnce(new Error("boom"));
    const { rerender } = render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("boom");
    });

    listCompanyComments.mockRejectedValueOnce("plain");
    rerender(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000002" />));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("plain");
    });
  });

  it("shows older roots toggle when more than five root notes exist", async () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      mkComment(`r${i}`, `note-${i}`, null, new Date(2024, 0, i + 1).toISOString()),
    );
    listCompanyComments.mockResolvedValue(rows);
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    const btn = await screen.findByRole("button", { name: /Ältere Notizen anzeigen/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    await waitFor(() => {
      expect(screen.getByText("note-0")).toBeInTheDocument();
    });
  });

  it("submits a reply with parentId after using reply on a comment", async () => {
    const rootIso = new Date(2024, 1, 1).toISOString();
    const childIso = new Date(2024, 1, 2).toISOString();
    listCompanyComments.mockResolvedValue([
      mkComment("root1", "Root body", null, rootIso),
      mkComment("child1", "Child body", "root1", childIso),
    ]);
    createCompanyComment.mockResolvedValue({
      id: "reply-new",
      entity_type: "company",
      entity_id: "00000000-0000-4000-8000-000000000001",
      parent_id: "child1",
      body_markdown: "Reply text",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: mockUserRow.id,
      updated_by: mockUserRow.id,
      deleted_at: null,
      deleted_by: null,
      profiles: { display_name: "Tester", avatar_url: null },
    });

    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Child body");
    const childCard = screen.getByText("Child body").closest("div.group");
    expect(childCard).toBeTruthy();
    const replyInChild = within(childCard as HTMLElement).getByRole("button", { name: /Antworten/i });
    await user.click(replyInChild);

    await waitFor(() => {
      expect(screen.getByText(/Antwort an/i)).toBeInTheDocument();
    });

    const composerBodies = screen.getAllByTestId("company-comment-composer-body");
    const ta = composerBodies[0];
    if (!ta) {
      throw new Error("Expected composer");
    }
    await user.type(ta, "Reply text");
    const submit = screen.getAllByRole("button", { name: /Antwort senden/i }).find((b) => !b.hasAttribute("disabled"));
    expect(submit).toBeTruthy();
    if (submit) {
      await user.click(submit);
    }
    await waitFor(() => {
      expect(createCompanyComment).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "00000000-0000-4000-8000-000000000001",
          bodyMarkdown: "Reply text",
          parentId: "child1",
        }),
      );
    });
  });

  it("updates a comment via edit flow", async () => {
    listCompanyComments.mockResolvedValue([mkComment("e1", "Edit me", null, new Date().toISOString())]);
    updateComment.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Edit me");
    await user.click(screen.getByRole("button", { name: /Bearbeiten/i }));
    const ta = screen.getByRole("textbox", { name: /Bearbeiten/i });
    await user.clear(ta);
    await user.type(ta, "Updated");
    await user.click(screen.getByRole("button", { name: /^Speichern$/i }));
    await waitFor(() => {
      expect(updateComment).toHaveBeenCalledWith(
        expect.objectContaining({ commentId: "e1", bodyMarkdown: "Updated" }),
      );
    });
  });

  it("deletes a comment from the confirm dialog", async () => {
    listCompanyComments.mockResolvedValue([mkComment("d1", "Delete me", null, new Date().toISOString())]);
    deleteComment.mockResolvedValue({ id: "d1" });
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Delete me");
    await user.click(screen.getByRole("button", { name: /^Löschen$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^Löschen$/i }));
    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith({ commentId: "d1" });
    });
  });

  it("hydrates empty draft when localStorage.getItem throws", async () => {
    const companyId = "00000000-0000-4000-8000-0000000000A3";
    listCompanyComments.mockResolvedValue([]);
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
      if (String(key).includes("comment-draft")) {
        throw new Error("ls");
      }
      return null;
    });
    render(wrapper(<CompanyCommentsCard companyId={companyId} />));
    const composerBodies = screen.getAllByTestId("company-comment-composer-body");
    const ta = composerBodies[0];
    if (!ta) {
      throw new Error("Expected composer");
    }
    expect(ta).toHaveValue("");
    spy.mockRestore();
  });

  it("expands list when URL search contains matching commentId", async () => {
    window.history.pushState({}, "", "/?commentId=deep1");
    const old = new Date(2024, 0, 1).toISOString();
    const young = new Date(2024, 0, 10).toISOString();
    listCompanyComments.mockResolvedValue([
      mkComment("old", "Older root", null, old),
      mkComment("deep1", "Deep target", null, young),
    ]);
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await waitFor(() => {
      expect(screen.getByText("Deep target")).toBeInTheDocument();
    });
    window.history.pushState({}, "", "/");
  });

  it("disables composer and template chips when no user session is available", async () => {
    listCompanyComments.mockResolvedValue([]);
    getCurrentUserClient.mockResolvedValue(null);
    render(wrapperNoSession(<CompanyCommentsCard companyId="00000000-0000-4000-8000-0000000000B1" />));
    const ta = await screen.findByTestId("company-comment-composer-body");
    expect(ta).toBeDisabled();
    await screen.findByText(/Starte die Konversation/i);
    const chips = screen.getAllByRole("button", { name: /Gesprächsnotiz/i });
    expect(chips[0]).toBeDisabled();
  });

  it("clears reply mode when cancelling from the reply banner", async () => {
    const rootIso = new Date(2024, 2, 1).toISOString();
    listCompanyComments.mockResolvedValue([mkComment("r-only", "Solo", null, rootIso)]);
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Solo");
    await user.click(screen.getByRole("button", { name: /Antworten/i }));
    expect(await screen.findByText(/Antwort an/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Antwort abbrechen/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Antwort an/i)).not.toBeInTheDocument();
    });
  });

  it("toasts restore failure when undo restore rejects", async () => {
    listCompanyComments.mockResolvedValue([mkComment("r-del", "Undo fail", null, new Date().toISOString())]);
    deleteComment.mockResolvedValue({ id: "r-del" });
    restoreOwnComment.mockRejectedValue(new Error("restore-bad"));
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Undo fail");
    await user.click(screen.getByRole("button", { name: /^Löschen$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^Löschen$/i }));
    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalled();
    });
    const successCalls = vi.mocked(toast.success).mock.calls;
    const withAction = successCalls.find((c) => c[1] && typeof c[1] === "object" && "action" in c[1]);
    const onClick = (withAction?.[1] as { action?: { onClick?: () => void } }).action?.onClick;
    onClick?.();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("offers undo in toast after deleting own comment and invokes restore when used", async () => {
    listCompanyComments.mockResolvedValue([mkComment("del1", "Gone soon", null, new Date().toISOString())]);
    deleteComment.mockResolvedValue({ id: "del1" });
    restoreOwnComment.mockResolvedValue(mkComment("del1", "Gone soon", null, new Date().toISOString()) as never);
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Gone soon");
    await user.click(screen.getByRole("button", { name: /^Löschen$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^Löschen$/i }));
    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalled();
    });
    const successCalls = vi.mocked(toast.success).mock.calls;
    const withAction = successCalls.find((c) => c[1] && typeof c[1] === "object" && "action" in c[1]);
    expect(withAction).toBeTruthy();
    const onClick = (withAction?.[1] as { action?: { onClick?: () => void } }).action?.onClick;
    expect(typeof onClick).toBe("function");
    onClick?.();
    await waitFor(() => {
      expect(restoreOwnComment).toHaveBeenCalled();
    });
  });

  it("toasts create failure after optimistic rollback", async () => {
    listCompanyComments.mockResolvedValue([]);
    createCompanyComment.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    const ta = screen.getAllByTestId("company-comment-composer-body")[0];
    if (!ta) {
      throw new Error("Expected composer");
    }
    await user.type(ta, "x");
    const submit = screen.getAllByRole("button", { name: /Kommentieren/i }).find((b) => !b.hasAttribute("disabled"));
    expect(submit).toBeTruthy();
    if (submit) {
      await user.click(submit);
    }
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("toasts update failure when save rejects", async () => {
    listCompanyComments.mockResolvedValue([mkComment("u1", "Body", null, new Date().toISOString())]);
    updateComment.mockRejectedValue(new Error("no"));
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Body");
    await user.click(screen.getByRole("button", { name: /Bearbeiten/i }));
    const ta = screen.getByRole("textbox", { name: /Bearbeiten/i });
    await user.clear(ta);
    await user.type(ta, "Nope");
    await user.click(screen.getByRole("button", { name: /^Speichern$/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("toasts delete failure when remove rejects", async () => {
    listCompanyComments.mockResolvedValue([mkComment("d2", "Del body", null, new Date().toISOString())]);
    deleteComment.mockRejectedValue(new Error("no"));
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Del body");
    await user.click(screen.getByRole("button", { name: /^Löschen$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^Löschen$/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("uses anonymous label in reply banner when parent has no display name", async () => {
    const iso = new Date(2024, 3, 1).toISOString();
    listCompanyComments.mockResolvedValue([
      {
        ...mkComment("anon-root", "Root", null, iso),
        profiles: { display_name: null, avatar_url: null },
      },
    ]);
    const user = userEvent.setup();
    render(wrapper(<CompanyCommentsCard companyId="00000000-0000-4000-8000-000000000001" />));
    await screen.findByText("Root");
    await user.click(screen.getByRole("button", { name: /Antworten/i }));
    expect(await screen.findByText(/Antwort an Teammitglied/)).toBeInTheDocument();
  });

  it("ignores localStorage draft persist failures without crashing", async () => {
    const companyId = "00000000-0000-4000-8000-0000000000B2";
    listCompanyComments.mockResolvedValue([]);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => {
      if (String(key).includes("comment-draft")) {
        throw new Error("quota");
      }
    });
    render(wrapper(<CompanyCommentsCard companyId={companyId} />));
    const ta = screen.getAllByTestId("company-comment-composer-body")[0];
    if (!ta) {
      throw new Error("Expected composer");
    }
    fireEvent.change(ta, { target: { value: "x" } });
    await waitFor(() => {
      expect(ta).toHaveValue("x");
    });
    setItem.mockRestore();
  });
});
