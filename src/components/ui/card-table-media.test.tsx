/**
 * Smoke tests for shadcn-style primitives used across the app:
 * {@link ./card.tsx}, {@link ./table.tsx}, {@link ./alert-dialog.tsx} (media slot).
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AlertDialogMedia } from "./alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

afterEach(() => {
  cleanup();
});

describe("Card primitives", () => {
  it("renders sm card with header action and footer slots", () => {
    render(
      <Card size="sm" data-testid="card-root">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>
            <button type="button">Action</button>
          </CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    const root = screen.getByTestId("card-root");
    expect(root).toHaveAttribute("data-size", "sm");
    expect(root.querySelector('[data-slot="card-action"]')).not.toBeNull();
    expect(root.querySelector('[data-slot="card-footer"]')).not.toBeNull();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});

describe("Table primitives", () => {
  it("renders caption and footer rows", () => {
    render(
      <Table>
        <TableCaption>Units sold</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Region</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>North</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByText("Units sold")).toBeInTheDocument();
    const footer = document.querySelector('[data-slot="table-footer"]');
    if (footer === null) {
      throw new Error("expected table footer slot");
    }
    expect(footer).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});

describe("AlertDialogMedia", () => {
  it("renders the media slot container", () => {
    const { container } = render(<AlertDialogMedia>icon</AlertDialogMedia>);
    const media = container.querySelector('[data-slot="alert-dialog-media"]');
    if (media === null) {
      throw new Error("expected alert-dialog-media slot");
    }
    expect(media).toHaveTextContent("icon");
  });
});
