/**
 * {@link ./LoadingState.tsx} — skeleton placeholder used in suspense fallbacks.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

afterEach(() => {
  cleanup();
});

describe("LoadingState", () => {
  it("renders one header bar and the default count of row skeletons", () => {
    const view = render(<LoadingState />);
    const skeletons = view.container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(6);
    expect(skeletons[0]).toHaveClass("h-8", "w-56");
    expect(skeletons[1]).toHaveClass("h-14", "w-full");
  });

  it("respects custom count, className, and itemClassName", () => {
    const view = render(
      <LoadingState count={2} className="my-root" itemClassName="h-10 w-1/2" />,
    );
    const root = view.container.firstElementChild;
    if (root === null) {
      throw new Error("expected root");
    }
    expect(root).toHaveClass("my-root");

    const skeletons = view.container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(3);
    expect(skeletons[1]).toHaveClass("h-10", "w-1/2");
    expect(skeletons[2]).toHaveClass("h-10", "w-1/2");
  });

  it("renders only the header skeleton when count is zero", () => {
    const view = render(<LoadingState count={0} />);
    const skeletons = view.container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(1);
  });
});
