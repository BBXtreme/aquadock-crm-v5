"use client";

import { useReactTable } from "@tanstack/react-table";

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
