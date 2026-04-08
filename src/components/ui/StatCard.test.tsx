import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

afterEach(() => {
  cleanup();
});

describe("StatCard", () => {
  it("renders title, value, and icon", () => {
    render(
      <StatCard
        title="Offene Deals"
        value="42"
        icon={<span data-testid="stat-icon">★</span>}
      />,
    );
    expect(screen.getByText("Offene Deals")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByTestId("stat-icon")).toBeInTheDocument();
  });

  it("renders numeric value as node", () => {
    render(<StatCard title="Umsatz" value={1250} icon={<span data-testid="i">x</span>} />);
    expect(screen.getByText("1250")).toBeInTheDocument();
  });

  it("renders optional change line when provided", () => {
    render(
      <StatCard
        title="T"
        value="0"
        icon={<span data-testid="i">x</span>}
        change="+12 % zum Vormonat"
      />,
    );
    expect(screen.getByText("+12 % zum Vormonat")).toBeInTheDocument();
  });

  it("does not render change when omitted", () => {
    render(<StatCard title="T" value="0" icon={<span data-testid="i">x</span>} />);
    expect(screen.queryByText("+12 % zum Vormonat")).not.toBeInTheDocument();
  });
});
