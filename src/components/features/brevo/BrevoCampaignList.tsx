// src/components/features/brevo/BrevoCampaignList.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CellContext,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchBrevoCampaignsAction } from "@/lib/actions/brevo";

type BrevoCampaign = {
  id: number;
  name: string;
  subject?: string;
  status: string;
  createdAt?: string | null;
};

const columns = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "subject", header: "Subject" },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ getValue }: CellContext<BrevoCampaign, unknown>) => {
      const raw = getValue();
      if (typeof raw !== "string" || raw === "") return "—";
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("de-DE");
    },
  },
] satisfies ColumnDef<BrevoCampaign>[];

export default function BrevoCampaignList() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["brevo-campaigns"],
    queryFn: fetchBrevoCampaignsAction,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const table = useReactTable<BrevoCampaign>({
    data: campaigns,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["brevo-campaigns"] });

  if (isLoading) return <div className="text-muted-foreground">Loading your campaigns...</div>;
  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="text-destructive">Error loading campaigns: {message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Your Brevo Campaigns</h2>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">No campaigns found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
