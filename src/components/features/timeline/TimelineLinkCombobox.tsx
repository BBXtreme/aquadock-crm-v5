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

export type TimelineLinkComboboxItem = {
  id: string;
  label: string;
  keywords: string[];
};

export type TimelineLinkComboboxProps = {
  value: string;
  onValueChange: (id: string) => void;
  items: TimelineLinkComboboxItem[];
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  clearLabel: string;
};

export const TimelineLinkCombobox = React.forwardRef<HTMLDivElement, TimelineLinkComboboxProps>(
  function TimelineLinkCombobox(
    {
      value,
      onValueChange,
      items,
      disabled = false,
      placeholder,
      searchPlaceholder,
      emptyMessage,
      clearLabel,
    },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(() => items.find((item) => item.id === value), [items, value]);
    const displayLabel = selected?.label ?? null;

    return (
      <div ref={ref} className="flex w-full min-w-0 gap-1">
        <div className="min-w-0 flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                aria-expanded={open}
                className={cn(
                  "h-8 w-full min-w-0 justify-between gap-2 overflow-hidden px-2.5 text-left font-normal whitespace-normal",
                )}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-left",
                    !displayLabel && "text-muted-foreground",
                  )}
                >
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
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        keywords={item.keywords}
                        onSelect={() => {
                          onValueChange(item.id);
                          setOpen(false);
                        }}
                      >
                        {item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
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

TimelineLinkCombobox.displayName = "TimelineLinkCombobox";
