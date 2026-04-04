// src/components/tables/TimelineTable.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper, type PaginationState } from "@tanstack/react-table";
import { Bell, Calendar, FileText, Mail, MoreHorizontal, Pencil, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";

import type { TimelineEntryWithJoins } from "@/types/database.types";

const columnHelper = createColumnHelper<TimelineEntryWithJoins>();

const getIcon = (t: string) => {
  switch (t) {
    case "note": return <FileText className="h-4 w-4" />;
    case "call": return <Phone className="h-4 w-4" />;
    case "email": return <Mail className="h-4 w-4" />;
    case "meeting": return <Calendar className="h-4 w-4" />;
    case "reminder": return <Bell className="h-4 w-4" />;
    default: return <MoreHorizontal className="h-4 w-4" />;
  }
};

const getVariant = (t: string) => {
  switch (t) {
    case "note": return "default";
    case "call": return "secondary";
    case "email": return "outline";
    case "meeting": return "destructive";
    case "reminder": return "secondary";
    default: return "outline";
  }
};

const columns = [
  columnHelper.accessor("created_at", {
    id: "Datum & Uhrzeit",
    header: "Datum & Uhrzeit",
    enableSorting: true,
    cell: (info) => {
      const date = info.getValue();
      if (!date) return <span>-</span>;
      const formatted = new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date as string)).replace(',', '');
      return <span>{formatted}</span>;
    },
  }),
  columnHelper.accessor("activity_type", {
    id: "Aktivität",
    header: "Aktivität",
    enableSorting: true,
    cell: (info) => {
      const type = info.row.original.activity_type;
      return (
        <Badge variant={getVariant(type)} className="flex items-center gap-1">
          {getIcon(type)}
          {type}
        </Badge>
      );
    },
  }),
  columnHelper.display({
    id: "Benutzer",
    header: "Benutzer",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.profiles?.display_name || "";
      const b = rowB.original.profiles?.display_name || "";
      return a.localeCompare(b);
    },
    cell: (info) => <span>{info.row.original.profiles?.display_name || "-"}</span>,
  }),
  columnHelper.display({
    id: "Firma",
    header: "Firma",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.companies?.firmenname || "";
      const b = rowB.original.companies?.firmenname || "";
      return a.localeCompare(b);
    },
    cell: (info) => (
      info.row.original.companies ? (
        <Link href={`/companies/${info.row.original.company_id}`} className="text-blue-600 hover:underline">
          {info.row.original.companies.firmenname}
        </Link>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    ),
  }),
  columnHelper.display({
    id: "Kontakt",
    header: "Kontakt",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = `${rowA.original.contacts?.vorname || ""} ${rowA.original.contacts?.nachname || ""}`.trim();
      const b = `${rowB.original.contacts?.vorname || ""} ${rowB.original.contacts?.nachname || ""}`.trim();
      return a.localeCompare(b);
    },
    cell: (info) => (
      info.row.original.contacts ? (
        <Link href={`/contacts/${info.row.original.contact_id}`} className="text-blue-600 hover:underline">
          {info.row.original.contacts.vorname} {info.row.original.contacts.nachname}
        </Link>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    ),
  }),
  columnHelper.display({
    id: "Titel & Beschreibung",
    header: "Titel & Beschreibung",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.title || "";
      const b = rowB.original.title || "";
      return a.localeCompare(b);
    },
    cell: (info) => (
      <div className="space-y-1">
        <div className="font-medium">{info.row.original.title}</div>
        <div className="text-sm text-muted-foreground">{info.row.original.content || "-"}</div>
      </div>
    ),
  }),
  columnHelper.display({
    id: "Aktionen",
    header: "Aktionen",
    cell: (info) => <ActionCell entry={info.row.original} />,
  }),
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
    } catch {
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
    } catch {
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
}

export default function TimelineTable({ data, isLoading }: TimelineTableProps = {}) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const { data: internalData = [], isLoading: internalLoading, error: internalError } = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("timeline")
        .select(`
          *,
          companies:company_id (firmenname, status, kundentyp),
          contacts:contact_id (vorname, nachname, position, email),
          profiles:updated_by (display_name)
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

  if (internalError && !data) {
    return <div className="text-red-500 p-4">Error loading timeline: {internalError.message}</div>;
  }

  return (
    <DataTable
      columns={columns}
      data={finalData}
      loading={finalIsLoading}
      searchPlaceholder="Suche nach Titel, Beschreibung, Firma oder Kontakt..."
    />
  );
}
