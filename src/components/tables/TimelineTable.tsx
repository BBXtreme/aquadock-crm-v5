"use client";

import { useState } from "react";
import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { Pencil, Trash2, FileText, Phone, Mail, Calendar, Bell, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TimelineEntryForm } from "@/components/features/timeline/TimelineEntryForm";
import { deleteTimelineEntry } from "@/lib/actions/timeline";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      }).format(new Date(date));
      return <span>{formatted}</span>;
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("type", {
    header: "Aktivität",
    cell: (info) => {
      const type = info.getValue();
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
        <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline">
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
        <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
          {contact.vorname} {contact.nachname}
        </Link>
      );
    },
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("title", {
    header: "Titel",
    cell: (info) => <span>{info.getValue()}</span>,
  }) as ColumnDef<TimelineEntryWithJoins>,
  columnHelper.accessor("description", {
    header: "Beschreibung",
    cell: (info) => <span>{info.getValue() || "-"}</span>,
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

  const handleDelete = async () => {
    try {
      await deleteTimelineEntry(entry.id);
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Eintrag gelöscht");
    } catch (error) {
      toast.error("Fehler beim Löschen");
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
            initialValues={{
              company_id: entry.company_id || "",
              contact_id: entry.contact_id || "",
              type: entry.type,
              title: entry.title,
              description: entry.description || "",
            }}
            onSubmit={async (values) => {
              // Assuming update logic is handled in the form
              setEditDialogOpen(false);
            }}
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
  data: TimelineEntryWithJoins[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}

export function TimelineTable({ data, isLoading, search, onSearchChange }: TimelineTableProps) {
  const filteredData = data.filter((entry) =>
    entry.title.toLowerCase().includes(search.toLowerCase()) ||
    entry.description?.toLowerCase().includes(search.toLowerCase()) ||
    entry.companies?.firmenname.toLowerCase().includes(search.toLowerCase()) ||
    entry.contacts?.vorname.toLowerCase().includes(search.toLowerCase()) ||
    entry.contacts?.nachname.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Input placeholder="Suche..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={`timeline-skeleton-${i + 1}`} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Suche nach Titel, Beschreibung, Firma oder Kontakt..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th key={col.id || col.header} className="text-left p-2 font-medium">
                  {typeof col.header === "string" ? col.header : col.header({} as any)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry) => (
              <tr key={entry.id} className="border-b hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.id || col.header} className="p-2">
                    {col.cell ? col.cell({ getValue: () => entry[col.accessorKey as keyof TimelineEntryWithJoins], row: { original: entry } } as any) : null}
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
