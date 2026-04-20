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
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type BrevoCampaignStatsRow,
  fetchBrevoCampaignStatsAction,
  fetchBrevoCampaignsAction,
} from "@/lib/actions/brevo";
import { useFormat, useT } from "@/lib/i18n/use-translations";

type BrevoCampaign = {
  id: number;
  name: string;
  subject?: string;
  status: string;
  createdAt?: string | null;
};

export default function BrevoCampaignList() {
  const t = useT("brevo");
  const format = useFormat();
  const queryClient = useQueryClient();

  const columns = useMemo<ColumnDef<BrevoCampaign>[]>(
    () => [
      { accessorKey: "name", header: t("campaignListColName") },
      { accessorKey: "subject", header: t("campaignListColSubject") },
      { accessorKey: "status", header: t("campaignListColStatus") },
      {
        accessorKey: "createdAt",
        header: t("campaignListColCreatedAt"),
        cell: ({ getValue }: CellContext<BrevoCampaign, unknown>) => {
          const raw = getValue();
          if (typeof raw !== "string" || raw === "") return "—";
          const date = new Date(raw);
          if (Number.isNaN(date.getTime())) return "—";
          return format.dateTime(date, { dateStyle: "medium" });
        },
      },
    ],
    [t, format],
  );

  const statsColumns = useMemo<ColumnDef<BrevoCampaignStatsRow>[]>(
    () => [
      { accessorKey: "name", header: t("campaignListColCampaign") },
      { accessorKey: "status", header: t("campaignListColStatus") },
      {
        accessorKey: "sent",
        header: t("campaignListColSent"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const n = Number(getValue());
          return format.number(Number.isFinite(n) ? n : 0);
        },
      },
      {
        accessorKey: "delivered",
        header: t("campaignListColDelivered"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const n = Number(getValue());
          return format.number(Number.isFinite(n) ? n : 0);
        },
      },
      {
        accessorKey: "opensRatePercent",
        header: t("campaignListColOpenRate"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const v = getValue();
          if (typeof v !== "number" || Number.isNaN(v)) return "—";
          return `${format.number(v)} %`;
        },
      },
      {
        accessorKey: "clickRatePercent",
        header: t("campaignListColClickRate"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const v = getValue();
          if (typeof v !== "number" || Number.isNaN(v)) return "—";
          return `${format.number(v)} %`;
        },
      },
      {
        accessorKey: "uniqueViews",
        header: t("campaignListColUniqueOpens"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const n = Number(getValue());
          return format.number(Number.isFinite(n) ? n : 0);
        },
      },
      {
        accessorKey: "uniqueClicks",
        header: t("campaignListColUniqueClicks"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const n = Number(getValue());
          return format.number(Number.isFinite(n) ? n : 0);
        },
      },
      {
        accessorKey: "complaints",
        header: t("campaignListColComplaints"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const n = Number(getValue());
          return format.number(Number.isFinite(n) ? n : 0);
        },
      },
      {
        accessorKey: "unsubscriptions",
        header: t("campaignListColUnsubscriptions"),
        cell: ({ getValue }: CellContext<BrevoCampaignStatsRow, unknown>) => {
          const n = Number(getValue());
          return format.number(Number.isFinite(n) ? n : 0);
        },
      },
    ],
    [t, format],
  );

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

  if (isLoading) return <div className="text-muted-foreground">{t("campaignListLoading")}</div>;
  if (error) {
    const message = error instanceof Error ? error.message : t("unknownError");
    return <div className="text-destructive">{t("campaignListLoadError", { message })}</div>;
  }

  const statsMessage = statsError instanceof Error ? statsError.message : t("unknownError");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t("campaignListHeading")}</h2>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("campaignListRefresh")}
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
              <TableCell colSpan={4} className="h-24 text-center">{t("campaignListEmpty")}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="space-y-2 pt-6">
        <h3 className="text-base font-semibold">{t("campaignListStatsHeading")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("campaignListStatsDescription")}
        </p>
        {statsError ? (
          <div className="text-destructive text-sm">{t("campaignListStatsLoadError", { message: statsMessage })}</div>
        ) : statsLoading ? (
          <div className="text-muted-foreground text-sm">{t("campaignListStatsLoading")}</div>
        ) : campaignStats.length === 0 ? (
          <div className="text-muted-foreground text-sm">{t("campaignListStatsEmpty")}</div>
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
          {t("campaignListStatsFooter")}{" "}
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
