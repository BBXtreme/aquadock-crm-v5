import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonList } from "./skeleton";

describe("Skeleton", () => {
  it("renders with data-slot", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
  });
});

describe("SkeletonList", () => {
  it("renders requested count", () => {
    const { container } = render(<SkeletonList count={4} />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(4);
  });
});
