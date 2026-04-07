"use client";

import { ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type AppearanceTimeZoneRegionId,
  formatTimeZoneMenuLabel,
  getAppearanceTimeZoneGroups,
} from "@/lib/constants/appearance-timezones";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

function timezoneRegionLabel(
  regionId: AppearanceTimeZoneRegionId,
  t: ReturnType<typeof useT<"settings">>,
): string {
  switch (regionId) {
    case "europe":
      return t("appearance.timezoneRegionEurope");
    case "americas":
      return t("appearance.timezoneRegionAmericas");
    case "africa":
      return t("appearance.timezoneRegionAfrica");
    case "asia":
      return t("appearance.timezoneRegionAsia");
    case "australia":
      return t("appearance.timezoneRegionAustralia");
    case "pacific":
      return t("appearance.timezoneRegionPacific");
    case "atlantic":
      return t("appearance.timezoneRegionAtlantic");
    case "indian":
      return t("appearance.timezoneRegionIndian");
    case "antarctica":
      return t("appearance.timezoneRegionAntarctica");
    case "arctic":
      return t("appearance.timezoneRegionArctic");
    case "other":
      return t("appearance.timezoneRegionOther");
  }
}

export interface AppearanceTimezoneSelectProps {
  value: string;
  onValueChange: (timeZone: string) => void;
  disabled?: boolean;
  id: string;
}

export function AppearanceTimezoneSelect({
  value,
  onValueChange,
  disabled = false,
  id,
}: AppearanceTimezoneSelectProps) {
  const [open, setOpen] = useState(false);
  const t = useT("settings");
  const localeTag = useNumberLocaleTag();

  const groups = useMemo(() => {
    try {
      const g = getAppearanceTimeZoneGroups(localeTag);
      // #region agent log
      fetch("http://127.0.0.1:7811/ingest/4f661c1b-aa49-4778-8f27-b8a02ff82f19", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "290de7" },
        body: JSON.stringify({
          sessionId: "290de7",
          runId: "pre-fix",
          hypothesisId: "H5",
          location: "AppearanceTimezoneSelect.tsx:groups",
          message: "getAppearanceTimeZoneGroups ok",
          data: { localeTag, groupCount: g.length },
          timestamp: Date.now(),
        }),
      }).catch(() => undefined);
      // #endregion
      return g;
    } catch (err) {
      // #region agent log
      fetch("http://127.0.0.1:7811/ingest/4f661c1b-aa49-4778-8f27-b8a02ff82f19", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "290de7" },
        body: JSON.stringify({
          sessionId: "290de7",
          runId: "pre-fix",
          hypothesisId: "H5",
          location: "AppearanceTimezoneSelect.tsx:groups",
          message: "getAppearanceTimeZoneGroups threw",
          data: { localeTag, error: err instanceof Error ? err.message : String(err) },
          timestamp: Date.now(),
        }),
      }).catch(() => undefined);
      // #endregion
      throw err;
    }
  }, [localeTag]);

  const displayLabel = useMemo(
    () => formatTimeZoneMenuLabel(value, localeTag),
    [value, localeTag],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "flex h-8 w-full max-w-md select-none items-center justify-between gap-1.5 whitespace-nowrap rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-normal outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-input/30",
          )}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[min(80vh,520px)] gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{t("appearance.timezoneDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="border-t border-border px-2 pb-2">
          <Command key={open ? "open" : "closed"} shouldFilter>
            <CommandInput placeholder={t("appearance.timezoneSearchPlaceholder")} />
            <CommandList>
              <CommandEmpty>{t("appearance.timezoneEmpty")}</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup
                  key={group.regionId}
                  heading={timezoneRegionLabel(group.regionId, t)}
                >
                  {group.zones.map((zone) => (
                    <CommandItem
                      key={zone.id}
                      value={`${zone.id} ${zone.label}`}
                      onSelect={() => {
                        onValueChange(zone.id);
                        setOpen(false);
                      }}
                    >
                      {zone.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
