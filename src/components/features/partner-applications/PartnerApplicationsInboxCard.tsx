"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPartnerApplications } from "@/lib/actions/partner-applications-admin";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import type { PartnerApplication } from "@/types/database.types";

function formatDate(iso: string, localeTag: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

export default function PartnerApplicationsInboxCard() {
  const t = useT("partnerApplications");
  const localeTag = useNumberLocaleTag();

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["admin-partner-applications"],
    queryFn: listPartnerApplications,
  });

  const columns: ColumnDef<PartnerApplication>[] = [
    {
      id: "applicant",
      header: t("colApplicant"),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.first_name} {row.original.last_name}
          </p>
          <p className="text-muted-foreground text-xs">{row.original.email}</p>
        </div>
      ),
    },
    {
      id: "territory",
      header: t("colTerritory"),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.city_region}, {row.original.country_code}
        </span>
      ),
    },
    {
      id: "status",
      header: t("colStatus"),
      cell: ({ row }) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase">
          {t(`status.${row.original.status}` as "status.new")}
        </span>
      ),
    },
    {
      id: "created",
      header: t("colSubmitted"),
      cell: ({ row }) => formatDate(row.original.created_at, localeTag),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/admin/partner-applications/${row.original.id}`}
          className="text-primary text-sm font-medium hover:underline"
        >
          {t("openDetail")}
        </Link>
      ),
    },
  ];

  const table = useReactTable({
    data: rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("inboxTitle")}</CardTitle>
        <CardDescription>{t("inboxDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : isError ? (
          <p className="text-destructive text-sm">{t("loadError")}</p>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
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
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-muted-foreground text-center">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
