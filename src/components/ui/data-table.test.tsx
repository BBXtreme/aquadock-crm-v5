import type { ColumnDef } from "@tanstack/react-table";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    enableSorting: true,
  },
];

afterEach(() => {
  cleanup();
});

describe("DataTable", () => {
  it("renders rows and global filter", async () => {
    const user = userEvent.setup();
    const onFilter = vi.fn();

    render(
      <DataTable
        data={[
          { id: "1", name: "Alpha" },
          { id: "2", name: "Beta" },
        ]}
        columns={columns}
        onGlobalFilterChange={onFilter}
        searchPlaceholder="Filter rows"
      />,
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("Filter rows");
    await user.type(input, "x");
    expect(onFilter).toHaveBeenCalled();
  });

  it("shows skeleton when loading", () => {
    const { container } = render(
      <DataTable data={[]} columns={columns} loading skeletonRows={2} pageSize={2} />,
    );
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("exports CSV and JSON", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {
      return undefined;
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      return undefined;
    });

    render(<DataTable data={[{ id: "1", name: 'Say "hi"' }]} columns={columns} />);

    await user.click(screen.getByRole("button", { name: "Export data" }));
    await user.click(await screen.findByRole("menuitem", { name: "Export CSV" }));
    await user.click(screen.getByRole("button", { name: "Export data" }));
    await user.click(await screen.findByRole("menuitem", { name: "Export JSON" }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    clickSpy.mockRestore();
  });

  it("opens column visibility menu", async () => {
    const user = userEvent.setup();
    render(<DataTable data={[{ id: "1", name: "A" }]} columns={columns} />);

    await user.click(screen.getByRole("button", { name: "Toggle columns" }));

    const menuItems = await screen.findAllByRole("menuitemcheckbox");
    expect(menuItems.length).toBeGreaterThan(0);
  });

  it("sorts when header clicked", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        data={[
          { id: "1", name: "B" },
          { id: "2", name: "A" },
        ]}
        columns={columns}
      />,
    );

    const table = screen.getByRole("table");
    const sortBtn = within(table).getByRole("button", { name: /^Name$/ });
    await user.click(sortBtn);
    await user.click(sortBtn);
  });
});
