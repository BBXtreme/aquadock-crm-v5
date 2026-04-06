"use client";

import { BREVO_RECIPIENT_FILTER_ALL } from "@/components/features/brevo/brevo-recipient-constants";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { kundentypOptions, statusOptions } from "@/lib/constants/company-options";

type BrevoRecipientFilterBarProps = {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  kundentypValue: string;
  onKundentypChange: (value: string) => void;
  statusValue: string;
  onStatusChange: (value: string) => void;
};

export function BrevoRecipientFilterBar({
  globalFilter,
  onGlobalFilterChange,
  kundentypValue,
  onKundentypChange,
  statusValue,
  onStatusChange,
}: BrevoRecipientFilterBarProps) {
  return (
    <div className="flex gap-4">
      <Input
        placeholder="Search contacts..."
        value={globalFilter}
        onChange={(e) => onGlobalFilterChange(e.target.value)}
        className="max-w-sm"
      />
      <Select value={kundentypValue} onValueChange={onKundentypChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Kundentyp" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BREVO_RECIPIENT_FILTER_ALL}>All</SelectItem>
          {kundentypOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusValue} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BREVO_RECIPIENT_FILTER_ALL}>All</SelectItem>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
