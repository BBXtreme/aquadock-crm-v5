import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentItem } from "@/components/features/comments/CommentItem";
import deMessages from "@/messages/de.json";
import type { CommentWithAuthor } from "@/types/database.types";

const companyId = "00000000-0000-4000-8000-000000000001";

vi.mock("@/lib/actions/comments", () => ({
  getCommentAttachmentSignedUrl: vi.fn(async () => ({
    signedUrl: "https://example.com/signed",
  })),
  deleteCommentAttachment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/client/open-signed-storage-url", () => ({
  openSignedStorageUrl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/client/upload-comment-attachments", () => ({
  uploadCommentAttachmentsForComment: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const ownerId = "00000000-0000-4000-8000-000000000099";
const otherId = "00000000-0000-4000-8000-000000000088";

function baseComment(over: Partial<CommentWithAuthor> = {}): CommentWithAuthor {
  const created = "2024-01-01T12:00:00.000Z";
  return {
    id: "c1",
    entity_type: "company",
    entity_id: "00000000-0000-4000-8000-000000000001",
    parent_id: null,
    body_markdown: "Original note",
    created_at: created,
    updated_at: created,
    created_by: ownerId,
    updated_by: ownerId,
    deleted_at: null,
    deleted_by: null,
    profiles: { display_name: "Pat Example", avatar_url: null },
    ...over,
  };
}

function wrapper(ui: ReactElement) {
  return <NextIntlClientProvider locale="de" messages={deMessages}>{ui}</NextIntlClientProvider>;
}

describe("CommentItem", () => {
  beforeEach(() => {
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
  });

  it("toasts copy failure when building the comment URL throws", async () => {
    const urlSpy = vi.spyOn(window, "URL").mockImplementationOnce(() => {
      throw new Error("bad");
    });
    const user = userEvent.setup();
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment()}
          currentUserId={ownerId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    await user.click(screen.getByRole("button", { name: /Link zur Notiz kopieren/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    urlSpy.mockRestore();
  });

  it("shows reply and copy for any user; hides owner edit/delete when not owner", () => {
    const onReply = vi.fn();
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment()}
          currentUserId={otherId}
          localeTag="de-DE"
          onReply={onReply}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole("button", { name: /Antworten/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bearbeiten/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Löschen$/i })).not.toBeInTheDocument();
  });

  it("saves edit on button click and on Ctrl+Enter; Escape cancels", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment()}
          currentUserId={ownerId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={onUpdate}
          onDelete={vi.fn()}
        />,
      ),
    );
    await user.click(screen.getByRole("button", { name: /Bearbeiten/i }));
    const ta = screen.getByRole("textbox", { name: /Bearbeiten/i });
    await user.clear(ta);
    await user.type(ta, "Edited once");
    await user.click(screen.getByRole("button", { name: /^Speichern$/i }));
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("c1", "Edited once");
    });

    await user.click(screen.getByRole("button", { name: /Bearbeiten/i }));
    const ta2 = screen.getByRole("textbox", { name: /Bearbeiten/i });
    await user.clear(ta2);
    await user.type(ta2, "Via keyboard");
    fireEvent.keyDown(ta2, { key: "Enter", ctrlKey: true });
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("c1", "Via keyboard");
    });

    await user.click(screen.getByRole("button", { name: /Bearbeiten/i }));
    const ta4 = screen.getByRole("textbox", { name: /Bearbeiten/i });
    await user.clear(ta4);
    await user.type(ta4, "Via meta");
    fireEvent.keyDown(ta4, { key: "Enter", metaKey: true });
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("c1", "Via meta");
    });

    await user.click(screen.getByRole("button", { name: /Bearbeiten/i }));
    const ta3 = screen.getByRole("textbox", { name: /Bearbeiten/i });
    fireEvent.keyDown(ta3, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: /Bearbeiten/i })).not.toBeInTheDocument();
  });

  it("does not call onUpdate when save is disabled (empty body)", async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment()}
          currentUserId={ownerId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={onUpdate}
          onDelete={vi.fn()}
        />,
      ),
    );
    await user.click(screen.getByRole("button", { name: /Bearbeiten/i }));
    const ta = screen.getByRole("textbox", { name: /Bearbeiten/i });
    await user.clear(ta);
    const save = screen.getByRole("button", { name: /^Speichern$/i });
    expect(save).toBeDisabled();
    fireEvent.keyDown(ta, { key: "Enter", ctrlKey: true });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("confirms delete via alert dialog", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment()}
          currentUserId={ownerId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={onDelete}
        />,
      ),
    );
    const deleteTriggers = screen.getAllByRole("button", { name: /^Löschen$/i });
    const firstDelete = deleteTriggers[0];
    if (!firstDelete) {
      throw new Error("Expected delete button");
    }
    await user.click(firstDelete);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^Löschen$/i }));
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("c1");
    });
  });

  it("shows inline parent hint at depth 2 with parent name", () => {
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment({ id: "c-deep", parent_id: "c-parent" })}
          currentUserId={otherId}
          localeTag="de-DE"
          depth={2}
          parentAuthorName="Parent Author"
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText(/Antwort an Parent Author/i)).toBeInTheDocument();
  });

  it("uses first two letters of a single-word display name for avatar initials", () => {
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment({
            profiles: { display_name: "Alice", avatar_url: null },
          })}
          currentUserId={otherId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("does not show edited marker when created_at is missing", () => {
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment({
            created_at: undefined,
            updated_at: new Date().toISOString(),
          })}
          currentUserId={otherId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    expect(screen.queryByText(/bearbeitet/i)).not.toBeInTheDocument();
  });

  it("shows two-letter initials when display name has two words", () => {
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment({
            profiles: { display_name: "Pat Example", avatar_url: null },
          })}
          currentUserId={otherId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText("PE")).toBeInTheDocument();
  });

  it("shows edited marker when updated_at is well after created_at", () => {
    render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment({
            updated_at: "2024-01-01T12:05:00.000Z",
          })}
          currentUserId={otherId}
          localeTag="de-DE"
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText(/bearbeitet/i)).toBeInTheDocument();
  });

  it("scrolls into view when highlighted", () => {
    const { rerender } = render(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment()}
          currentUserId={otherId}
          localeTag="de-DE"
          isHighlighted={false}
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    rerender(
      wrapper(
        <CommentItem
          companyId={companyId}
          comment={baseComment()}
          currentUserId={otherId}
          localeTag="de-DE"
          isHighlighted
          onReply={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
