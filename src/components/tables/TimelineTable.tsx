"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Bell, Calendar, FileText, Mail, MoreHorizontal, Pencil, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";

import type { TimelineEntryWithJoins } from "@/types/database.types";

const columnHelper = createColumnHelper<TimelineEntryWithJoins>();

const columns = [
  columnHelper.accessor("created_at", {
    header: "Datum & Uhrzeit",
    cell: (info) => {
      const date = info.getValue();
      if (!date) return <span>-</span>;
      const formatted = new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date as string));
      return <span>{formatted}</span>;
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("activity_type", {
    header: "Aktivität",
    cell: (info) => {
      const type = info.getValue() as string;
      const getIcon = (t: string) => {
        switch (t) {
          case "note":
            return <FileText className="h-4 w-4" />;
          case "call":
            return <Phone className="h-4 w-4" />;
          case "email":
            return <Mail className="h-4 w-4" />;
          case "meeting":
            return <Calendar className="h-4 w-4" />;
          case "reminder":
            return <Bell className="h-4 w-4" />;
          default:
            return <MoreHorizontal className="h-4 w-4" />;
        }
      };
      const getVariant = (t: string) => {
        switch (t) {
          case "note":
            return "default";
          case "call":
            return "secondary";
          case "email":
            return "outline";
          case "meeting":
            return "destructive";
          case "reminder":
            return "secondary";
          default:
            return "outline";
        }
      };
      return (
        <Badge variant={getVariant(type)} className="flex items-center gap-1">
          {getIcon(type)}
          {type}
        </Badge>
      );
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("companies", {
    header: "Firma",
    cell: (info) => {
      const company = info.getValue();
      if (!company) return <span>-</span>;
      return (
        <Link href={`/companies/${info.row.original.company_id}`} className="text-blue-600 hover:underline">
          {company.firmenname}
        </Link>
      );
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("contacts", {
    header: "Kontakt",
    cell: (info) => {
      const contact = info.getValue();
      if (!contact) return <span>-</span>;
      return (
        <Link href={`/contacts/${info.row.original.contact_id}`} className="text-blue-600 hover:underline">
          {contact.vorname} {contact.nachname}
        </Link>
      );
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("title", {
    header: "Titel",
    cell: (info) => <span>{info.getValue()}</span>,
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("content", {
    header: "Beschreibung",
    cell: (info) => <span>{(info.getValue() as string | null) || "-"}</span>,
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.display({
    id: "actions",
    header: "Aktionen",
    cell: (info) => <ActionCell entry={info.row.original} />,
  }) as ColumnDef<TimelineEntryWithJoins>,
] satisfies ColumnDef<TimelineEntryWithJoins>[];

function ActionCell({ entry }: { entry: TimelineEntryWithJoins }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname, kundentyp")
        .order("firmenname", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; firmenname: string; kundentyp?: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, vorname, nachname, email, telefon, position")
        .order("nachname")
        .order("vorname")
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/timeline/${entry.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success("Eintrag gelöscht");
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    } catch (_error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const handleEditSubmit = async (values: unknown) => {
    try {
      const res = await fetch(`/api/timeline/${entry.id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success("Eintrag aktualisiert");
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    } catch (_error) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eintrag bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie den Timeline-Eintrag.</DialogDescription>
          </DialogHeader>
          <TimelineEntryForm
            editEntry={entry}
            isSubmitting={false}
            companies={companies}
            contacts={contacts}
            onSubmit={handleEditSubmit}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diesen Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TimelineTableProps {
  data?: TimelineEntryWithJoins[];
  isLoading?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export default function TimelineTable({ data, isLoading, search, onSearchChange }: TimelineTableProps = {}) {
  const [internalSearch, setInternalSearch] = useState("");

  const { data: internalData = [], isLoading: internalLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("timeline")
        .select(`
          *,
          companies:company_id (firmenname, status, kundentyp),
          contacts:contact_id (vorname, nachname, position, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as TimelineEntryWithJoins[];
    },
    enabled: !data,
  });

  const finalData = data || internalData;
  const finalIsLoading = isLoading !== undefined ? isLoading : internalLoading;
  const finalSearch = search !== undefined ? search : internalSearch;
  const finalOnSearchChange = onSearchChange || setInternalSearch;

  const filteredData = useMemo(() => finalData.filter((entry) =>
    (entry.title || "").toLowerCase().includes(finalSearch.toLowerCase()) ||
    (entry.content || "").toLowerCase().includes(finalSearch.toLowerCase()) ||
    (entry.companies?.firmenname || "").toLowerCase().includes(finalSearch.toLowerCase()) ||
    (entry.contacts?.vorname || "").toLowerCase().includes(finalSearch.toLowerCase()) ||
    (entry.contacts?.nachname || "").toLowerCase().includes(finalSearch.toLowerCase())
  ), [finalData, finalSearch]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (finalIsLoading) {
    return (
      <div className="space-y-4">
        <Input placeholder="Suche..." value={finalSearch} onChange={(e) => finalOnSearchChange(e.target.value)} />
        <div className="space-y-2">
          {["timeline-skeleton-1", "timeline-skeleton-2", "timeline-skeleton-3", "timeline-skeleton-4", "timeline-skeleton-5", "timeline-skeleton-6"].map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Suche nach Titel, Beschreibung, Firma oder Kontakt..."
        value={finalSearch}
        onChange={(e) => finalOnSearchChange(e.target.value)}
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="text-left p-2 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
