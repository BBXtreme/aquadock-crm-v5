"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow, isAfter } from "date-fns";
import Link from "next/link";
import { Eye, Edit, Trash } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const columnHelper = createColumnHelper<any>();

export const reminderColumns = (
  handleEdit: (reminder: any) => void,
  handleView: (reminder: any) => void,
  handleDelete: (id: string) => void,
): ColumnDef<any>[] => [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  }),
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => (
      <button
        className="text-blue-600 hover:underline"
        onClick={() => handleEdit(info.row.original)}
      >
        {info.getValue()}
      </button>
    ),
  }),
  columnHelper.accessor("companies.firmenname", {
    id: "company",
    header: "Company",
    cell: (info) => (
      <Link
        href={`/companies/${info.row.original.company_id}`}
        className="text-blue-600 hover:underline"
      >
        {info.getValue()}
    </Link>
    ),
  }),
  columnHelper.accessor("due_date", {
    header: "Due Date",
    cell: (info) => {
      const isOverdue = isAfter(
        new Date(),
        new Date(info.getValue() as string),
      );
      return (
        <span className={isOverdue ? "text-rose-500" : ""}>
          {formatDistanceToNow(new Date(info.getValue() as string), {
            addSuffix: true,
          })}
        </span>
      );
    },
  }),
  columnHelper.accessor("priority", {
    header: "Priority",
    cell: (info) => (
      <Badge
        className={
          info.getValue() === "hoch"
            ? "bg-orange-500 text-white"
            : info.getValue() === "normal"
              ? "bg-blue-500 text-white"
              : "bg-gray-500 text-white"
        }
      >
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge
        className={
          info.getValue() === "open"
            ? "bg-emerald-600 text-white"
            : "bg-zinc-500 text-white"
        }
      >
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("assigned_to", {
    header: "Assigned To",
    cell: (info) => info.getValue(),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => (
      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleView(info.row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(info.row.original)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(info.row.original.id)}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    ),
    enableSorting: false,
  }),
];

interface RemindersTableProps {
  reminders: any[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

export default function RemindersTable({
  reminders,
  globalFilter,
  onGlobalFilterChange,
}: RemindersTableProps) {
  return (
    <div>Reminders Table placeholder</div>
  );
}
