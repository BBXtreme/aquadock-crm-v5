"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
} from "@tanstack/react-table";
import { Trash2, FileText, Phone, Mail, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeDisplay } from "@/lib/utils/data-format";
import { getTimelineEntries, deleteTimelineEntry } from "@/lib/services/timeline";
import type { TimelineEntryWithJoins } from "@/types/database.types";

interface TimelineTableProps {
  companyId?: string;
}

const columnHelper = createColumnHelper<TimelineEntryWithJoins>();

const columns = [
  columnHelper.accessor("created_at", {
    header: "Date/Time",
    cell: (info) => new Date(info.getValue()).toLocaleString("de-DE"),
  }),
  columnHelper.accessor("type", {
    header: "Type",
    cell: (info) => {
      const type = info.getValue();
      const getIcon = () => {
        switch (type) {
          case "note":
            return <FileText className="h-4 w-4" />;
          case "call":
            return <Phone className="h-4 w-4" />;
          case "email":
            return <Mail className="h-4 w-4" />;
          case "meeting":
            return <Users className="h-4 w-4" />;
          default:
            return null;
        }
      };
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          {getIcon()}
          {type}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.accessor("description", {
    header: "Description",
    cell: (info) => {
      const desc = safeDisplay(info.getValue());
      return desc.length > 50 ? `${desc.slice(0, 50)}...` : desc;
    },
  }),
  columnHelper.accessor("user_id", {
    header: "User",
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => <DeleteButton timelineId={info.row.original.id} />,
  }),
] satisfies ColumnDef<TimelineEntryWithJoins>[];

function DeleteButton({ timelineId }: { timelineId: string }) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteTimelineEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => deleteMutation.mutate(timelineId)}
      disabled={deleteMutation.isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export default function TimelineTable({ companyId }: TimelineTableProps) {
  const queryClient = useQueryClient();

  const { data: timelineEntries, isLoading, error } = useQuery({
    queryKey: ["timeline", companyId],
    queryFn: () => getTimelineEntries(companyId),
  });

  const table = useReactTable({
    data: timelineEntries ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
    },
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Error loading timeline entries. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : header.column.getCanSort()
                        ? (
                            <Button
                              variant="ghost"
                              onClick={header.column.getToggleSortingHandler()}
                              className="h-auto p-0 font-medium"
                            >
                              {header.column.columnDef.header as string}
                              {{
                                asc: " ↑",
                                desc: " ↓",
                              }[header.column.getIsSorted() as string] ?? null}
                            </Button>
                          )
                        : (header.column.columnDef.header as string)}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={`timeline-skeleton-${i + 1}`}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : timelineEntries && timelineEntries.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {cell.renderValue() as React.ReactNode}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    No timeline entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
