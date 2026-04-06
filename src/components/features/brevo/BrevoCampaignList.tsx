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
import {
  type BrevoCampaignStatsRow,
  fetchBrevoCampaignStatsAction,
  fetchBrevoCampaignsAction,
} from "@/lib/actions/brevo";

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

const statsColumns = [
  { accessorKey: "name", header: "Kampagne" },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "sent",
    header: "Gesendet",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const n = Number(getValue());
      return formatStatInt(Number.isFinite(n) ? n : 0);
    },
  },
  {
    accessorKey: "delivered",
    header: "Zugestellt",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const n = Number(getValue());
      return formatStatInt(Number.isFinite(n) ? n : 0);
    },
  },
  {
    accessorKey: "opensRatePercent",
    header: "Öffnungsrate",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const v = getValue();
      if (typeof v !== "number" || Number.isNaN(v)) return "—";
      return `${v.toLocaleString("de-DE")} %`;
    },
  },
  {
    accessorKey: "clickRatePercent",
    header: "Klickrate",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const v = getValue();
      if (typeof v !== "number" || Number.isNaN(v)) return "—";
      return `${v.toLocaleString("de-DE")} %`;
    },
  },
  {
    accessorKey: "uniqueViews",
    header: "Eindeutige Öffnungen",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const n = Number(getValue());
      return formatStatInt(Number.isFinite(n) ? n : 0);
    },
  },
  {
    accessorKey: "uniqueClicks",
    header: "Eindeutige Klicks",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const n = Number(getValue());
      return formatStatInt(Number.isFinite(n) ? n : 0);
    },
  },
  {
    accessorKey: "complaints",
    header: "Beschwerden",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const n = Number(getValue());
      return formatStatInt(Number.isFinite(n) ? n : 0);
    },
  },
  {
    accessorKey: "unsubscriptions",
    header: "Abmeldungen",
    cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
      const n = Number(getValue());
      return formatStatInt(Number.isFinite(n) ? n : 0);
    },
  },
] satisfies ColumnDef<BrevoCampaignStatsRow>[];

function formatStatInt(value: number): string {
  return value.toLocaleString("de-DE");
}

export default function BrevoCampaignList() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["brevo-campaigns"],
    queryFn: fetchBrevoCampaignsAction,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: campaignStats = [],
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["brevo-campaign-stats"],
    queryFn: fetchBrevoCampaignStatsAction,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const table = useReactTable<BrevoCampaign>({
    data: campaigns,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const statsTable = useReactTable<BrevoCampaignStatsRow>({
    data: campaignStats,
    columns: statsColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["brevo-campaigns"] });
    void queryClient.invalidateQueries({ queryKey: ["brevo-campaign-stats"] });
  };

  if (isLoading) return <div className="text-muted-foreground">Loading your campaigns...</div>;
  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <div className="text-destructive">Error loading campaigns: {message}</div>;
  }

  const statsMessage = statsError instanceof Error ? statsError.message : "Unbekannter Fehler";

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

      <div className="space-y-2 pt-6">
        <h3 className="text-base font-semibold">Kampagnen-Statistiken</h3>
        <p className="text-muted-foreground text-sm">
          Kennzahlen aus Brevo (globalStats). Für ältere Kampagnen kann die API nur Ereignisse der letzten Monate
          liefern.
        </p>
        {statsError ? (
          <div className="text-destructive text-sm">Statistiken konnten nicht geladen werden: {statsMessage}</div>
        ) : statsLoading ? (
          <div className="text-muted-foreground text-sm">Statistiken werden geladen …</div>
        ) : campaignStats.length === 0 ? (
          <div className="text-muted-foreground text-sm">Keine Kampagnen für Statistiken.</div>
        ) : (
          <Table>
            <TableHeader>
              {statsTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {statsTable.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-muted-foreground text-sm">
          Ausführlichere Auswertungen und Kampagnenverwaltung direkt in Brevo:{" "}
          <a
            href="https://app.brevo.com/campaigns/listing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            app.brevo.com/campaigns/listing
          </a>
        </p>
      </div>
    </div>
  );
}
