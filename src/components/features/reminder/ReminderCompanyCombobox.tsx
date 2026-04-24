"use client";

import { ChevronDownIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ReminderCompanyComboboxProps = {
  value: string;
  onValueChange: (companyId: string) => void;
  companies: { id: string; firmenname: string }[];
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  clearLabel: string;
};

export const ReminderCompanyCombobox = React.forwardRef<HTMLDivElement, ReminderCompanyComboboxProps>(
  function ReminderCompanyCombobox(
    {
      value,
      onValueChange,
      companies,
      disabled = false,
      placeholder,
      searchPlaceholder,
      emptyMessage,
      clearLabel,
    },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(() => companies.find((c) => c.id === value), [companies, value]);
    const displayLabel = selected?.firmenname ?? null;

    return (
      <div ref={ref} className="flex w-full min-w-0 gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-expanded={open}
              className={cn("h-8 min-w-0 flex-1 justify-between gap-2 px-2.5 font-normal")}
            >
              <span className={cn("truncate", !displayLabel && "text-muted-foreground")}>
                {displayLabel ?? placeholder}
              </span>
              <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
            <Command shouldFilter>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {companies.map((company) => (
                    <CommandItem
                      key={company.id}
                      value={company.id}
                      keywords={[company.firmenname]}
                      onSelect={() => {
                        onValueChange(company.id);
                        setOpen(false);
                      }}
                    >
                      {company.firmenname}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={disabled}
            aria-label={clearLabel}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onValueChange("");
            }}
          >
            <XIcon className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    );
  },
);

ReminderCompanyCombobox.displayName = "ReminderCompanyCombobox";
