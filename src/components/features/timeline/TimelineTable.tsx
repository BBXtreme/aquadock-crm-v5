"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Bell, FileText, Mail, Phone, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteTimelineEntry, getTimelineEntries } from "@/lib/services/timeline";
import { safeDisplay } from "@/lib/utils/data-format";
import type { TimelineEntryWithJoins } from "@/types/database.types";
import TimelineEntryForm from "./TimelineEntryForm";

interface TimelineTableProps {
  companyId?: string;
}

const columnHelper = createColumnHelper<TimelineEntryWithJoins>();

const getActivityBadge = (type: string) => {
  const config = {
    note: { icon: FileText, variant: "secondary" as const, color: "text-blue-600" },
    call: { icon: Phone, variant: "secondary" as const, color: "text-green-600" },
    email: { icon: Mail, variant: "secondary" as const, color: "text-purple-600" },
    meeting: { icon: Users, variant: "secondary" as const, color: "text-orange-600" },
    reminder: { icon: Bell, variant: "destructive" as const, color: "text-red-600" },
  };
  const { icon: Icon, variant, color } = config[type as keyof typeof config] || config.note;
  return (
    <Badge variant={variant} className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {type}
    </Badge>
  );
};

const columns: ColumnDef<TimelineEntryWithJoins>[] = [
  columnHelper.accessor("created_at", {
    header: "Date/Time",
    cell: (info) => {
      const date = info.getValue();
      return date
        ? new Date(date).toLocaleString("de-DE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("activity_type", {
    header: "Type",
    cell: (info) => getActivityBadge(info.getValue() as string),
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => safeDisplay(info.getValue()),
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("content", {
    header: "Description",
    cell: (info) => {
      const desc = safeDisplay(info.getValue());
      const truncated = desc.length > 50 ? `${desc.slice(0, 50)}...` : desc;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">{truncated}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{desc}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("companies.firmenname", {
    header: "Company",
    cell: (info) => {
      const firmenname = info.getValue();
      const companyId = info.row.original.company_id;
      if (firmenname && companyId) {
        return (
          <Link href={`/companies/${companyId}`} className="text-primary hover:underline">
            {firmenname}
          </Link>
        );
      }
      return safeDisplay(firmenname);
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("contacts.vorname", {
    header: "Contact",
    cell: (info) => {
      const vorname = info.getValue();
      const nachname = info.row.original.contacts?.nachname;
      const contactId = info.row.original.contact_id;
      const name = [vorname, nachname].filter(Boolean).join(" ");
      if (name && contactId) {
        return (
          <Link href={`/contacts/${contactId}`} className="text-primary hover:underline">
            {name}
          </Link>
        );
      }
      return safeDisplay(name);
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("user_name", {
    header: "User",
    cell: (info) => safeDisplay(info.getValue()),
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => <ActionButtons entry={info.row.original} />,
  }),
];

function ActionButtons({ entry }: { entry: TimelineEntryWithJoins }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteTimelineEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setDeleteDialogOpen(false);
    },
  });

  // Assume update function exists or placeholder
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Placeholder for update
      console.log("Update", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setEditDialogOpen(false);
    },
  });

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
        Edit
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
        Delete
      </Button>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timeline Entry</DialogTitle>
          </DialogHeader>
          <TimelineEntryForm
            initialValues={entry}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: entry.id, ...values });
            }}
            isSubmitting={updateMutation.isPending}
            companies={[]} // Placeholder
            contacts={[]} // Placeholder
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timeline Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this timeline entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(entry.id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TimelineTable({ companyId }: TimelineTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: timelineEntries, isLoading, error } = useQuery({
    queryKey: ["timeline", companyId],
    queryFn: () => getTimelineEntries(companyId),
  });

  const filteredData = useMemo(() => {
    if (!searchTerm) return timelineEntries ?? [];
    return (timelineEntries ?? []).filter(
      (entry) =>
        entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [timelineEntries, searchTerm]);

  const table = useReactTable({
    data: filteredData,
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
        <CardHeader>
          <CardTitle>Timeline Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive py-8">
            Error loading timeline entries. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Timeline Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
                  <>
                    <TableRow key="timeline-skeleton-1">
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                    <TableRow key="timeline-skeleton-2">
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                    <TableRow key="timeline-skeleton-3">
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                    <TableRow key="timeline-skeleton-4">
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                    <TableRow key="timeline-skeleton-5">
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                    <TableRow key="timeline-skeleton-6">
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  </>
                ) : filteredData.length > 0 ? (
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
                    <TableCell colSpan={columns.length} className="text-center py-8">
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-muted-foreground">No timeline entries found.</p>
                        <Button>Neuer Eintrag</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
