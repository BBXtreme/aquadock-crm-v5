import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

describe("Popover", () => {
  it("renders anchor slot when used", () => {
    const { container } = render(
      <Popover>
        <PopoverAnchor data-testid="anchor" />
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Inside</PopoverContent>
      </Popover>,
    );
    expect(container.querySelector('[data-slot="popover-anchor"]')).toBeInTheDocument();
  });
});
