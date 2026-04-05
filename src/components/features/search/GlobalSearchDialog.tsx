// src/components/features/search/GlobalSearchDialog.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Bell, Building, Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { performGlobalSearch } from "@/lib/actions/search";
import { searchKeys } from "@/lib/query/keys";
import { safeDisplay } from "@/lib/utils/data-format";

interface GlobalSearchDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const iconMap = {
  company: Building,
  contact: Users,
  reminder: Bell,
  timeline: Clock,
};

export function GlobalSearchDialog({ open, setOpen }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: results = [] } = useQuery({
    queryKey: searchKeys.results(query),
    queryFn: async () => {
      const formData = new FormData();
      formData.append("query", query);
      return performGlobalSearch(formData);
    },
    enabled: query.length > 0,
    staleTime: 1000,
  });

  const groupedResults = results.reduce((acc, result) => {
    const type = result.type;
    if (!acc[type]) acc[type] = [];
    acc[type]!.push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0">
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder="Search companies, contacts, reminders..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(groupedResults).map(([type, items]) => (
              <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)}>
                {items.map((item) => {
                  const Icon = iconMap[item.type as keyof typeof iconMap];
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{safeDisplay(item.title)}</div>
                        <div className="text-sm text-muted-foreground">{safeDisplay(item.subtitle)}</div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
