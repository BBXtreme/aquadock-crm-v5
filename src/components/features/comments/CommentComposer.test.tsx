import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentComposer } from "@/components/features/comments/CommentComposer";
import deMessages from "@/messages/de.json";

function wrapper(ui: ReactElement) {
  return (
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("CommentComposer", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      (cb as (t: number) => void)(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.mocked(window.requestAnimationFrame).mockRestore();
  });

  it("does not show submit or markdown footer when empty and not focused", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      wrapper(
        <CommentComposer value="" onChange={onChange} onSubmit={onSubmit} disabled={false} />,
      ),
    );

    expect(screen.queryByRole("button", { name: /Kommentieren/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Markdown unterstützt/i)).not.toBeInTheDocument();
  });

  it("shows markdown hint when focused while empty; submit stays hidden until there is content", async () => {
    const user = userEvent.setup();
    render(
      wrapper(
        <CommentComposer value="" onChange={vi.fn()} onSubmit={vi.fn()} disabled={false} />,
      ),
    );

    const bodies = screen.getAllByTestId("company-comment-composer-body");
    const ta = bodies[0];
    if (!ta) {
      throw new Error("Expected composer textarea");
    }
    await user.click(ta);

    expect(await screen.findByText(/Markdown unterstützt/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kommentieren/i })).not.toBeInTheDocument();
  });

  it("shows submit when value has content (controlled)", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      wrapper(
        <CommentComposer value="Hi" onChange={onChange} onSubmit={onSubmit} disabled={false} />,
      ),
    );

    expect(screen.getByRole("button", { name: /Kommentieren/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Markdown unterstützt/i)[0]).toBeInTheDocument();
  });

  it("applies bold snippet from toolbar after focus and wires textareaRef object", async () => {
    const onChange = vi.fn();
    const ref = createRef<HTMLTextAreaElement>();
    const user = userEvent.setup();
    render(
      wrapper(
        <CommentComposer value="Hi" onChange={onChange} onSubmit={vi.fn()} disabled={false} textareaRef={ref} />,
      ),
    );
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);

    const ta = screen.getByTestId("company-comment-composer-body");
    await user.click(ta);
    (ta as HTMLTextAreaElement).setSelectionRange(0, 2);
    await user.click(screen.getByRole("button", { name: /Fett/i }));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0]?.[0]).toContain("**");
  });

  it("toggles preview tab when content exists", async () => {
    const user = userEvent.setup();
    render(
      wrapper(<CommentComposer value="x" onChange={vi.fn()} onSubmit={vi.fn()} disabled={false} />),
    );
    await user.click(screen.getByRole("button", { name: /^Vorschau$/i }));
    expect(screen.getByRole("button", { name: /^Vorschau$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("submits on Meta+Enter when allowed", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(wrapper(<CommentComposer value="ok" onChange={vi.fn()} onSubmit={onSubmit} disabled={false} />));
    const ta = screen.getByTestId("company-comment-composer-body");
    await user.click(ta);
    fireEvent.keyDown(ta, { key: "Enter", metaKey: true });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("cancels reply on Escape when replying", async () => {
    const onCancelReply = vi.fn();
    const user = userEvent.setup();
    render(
      wrapper(
        <CommentComposer
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
          isReplying
          replyBanner="Replying"
          onCancelReply={onCancelReply}
        />,
      ),
    );
    const ta = screen.getByTestId("company-comment-composer-body");
    await user.click(ta);
    fireEvent.keyDown(ta, { key: "Escape" });
    expect(onCancelReply).toHaveBeenCalled();
  });

  it("shows reply banner cancel button and uses submitReply label", () => {
    render(
      wrapper(
        <CommentComposer
          value="x"
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
          isReplying
          replyBanner="To someone"
          onCancelReply={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText("To someone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Antwort abbrechen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Antwort senden/i })).toBeInTheDocument();
  });

  it("shows submitting label while mutation pending", () => {
    render(
      wrapper(
        <CommentComposer value="x" onChange={vi.fn()} onSubmit={vi.fn()} disabled={false} isSubmitting />,
      ),
    );
    expect(screen.getByRole("button", { name: /Wird gesendet/i })).toBeInTheDocument();
  });

  it("inserts task list snippet from toolbar", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(wrapper(<CommentComposer value="" onChange={onChange} onSubmit={vi.fn()} disabled={false} />));
    const ta = screen.getByTestId("company-comment-composer-body");
    await user.click(ta);
    await user.click(screen.getByRole("button", { name: /Aufgabenliste/i }));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0]?.[0]).toContain("- [ ]");
  });
});
