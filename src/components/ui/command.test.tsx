/**
 * Covers {@link ./command.tsx} CommandDialog and CommandSeparator branches for coverage.
 */

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import enMessages from "@/messages/en.json";

function withIntl(ui: ReactElement) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>;
}

describe("Command primitives", () => {
  it("renders CommandDialog with custom title and description", () => {
    render(
      withIntl(
        <CommandDialog open title="Custom palette" description="Find an action">
          <Command>
            <CommandInput placeholder="Search" />
            <CommandList>
              <CommandSeparator />
            </CommandList>
          </Command>
        </CommandDialog>,
      ),
    );
    expect(screen.getByText("Custom palette")).toBeInTheDocument();
    expect(screen.getByText("Find an action")).toBeInTheDocument();
  });
});
