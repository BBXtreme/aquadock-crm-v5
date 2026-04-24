import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/ui/status-badge";

describe("StatusBadge", () => {
  it("uses plain label and map color by default", () => {
    render(<StatusBadge status="lead" />);
    expect(screen.getByText("Neu")).toBeInTheDocument();
  });

  it("prefers emoji label when showEmoji is true", () => {
    render(<StatusBadge status="lead" showEmoji />);
    expect(screen.getByText("🔍 Neu")).toBeInTheDocument();
  });

  it("falls back to trimmed raw label and gray when status is unknown", () => {
    render(<StatusBadge status="  Custom  " showEmoji />);
    const badge = screen.getByText("Custom");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: "#6b7280" });
  });
});
