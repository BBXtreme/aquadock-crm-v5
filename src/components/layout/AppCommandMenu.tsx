"use client";

import { Inbox, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  appShellMarketingNav,
  appShellQuickCreate,
  appShellSalesNav,
} from "@/lib/constants/app-shell-navigation";
import { useT } from "@/lib/i18n/use-translations";

type AppCommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AppCommandMenu({ open, onOpenChange }: AppCommandMenuProps) {
  const router = useRouter();
  const t = useT("layout");
  const ts = useT("layout.sidebar");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    },
    [onOpenChange, open],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const run = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("commandPaletteTitle")}
      description={t("commandPaletteDescription")}
    >
      <Command shouldFilter>
        <CommandInput
          placeholder={t("commandPalettePlaceholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{t("commandPaletteEmpty")}</CommandEmpty>
          <CommandGroup heading={ts("groupSales")}>
            {appShellSalesNav.map((item) => {
              const Icon = item.icon;
              const label = ts(item.messageKey);
              return (
                <CommandItem
                  key={item.href}
                  value={`${label} ${item.href}`}
                  onSelect={() => {
                    run(item.href);
                  }}
                >
                  <Icon className="text-muted-foreground" aria-hidden />
                  {label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading={t("commandPaletteQuickCreateGroup")}>
            {appShellQuickCreate.map((item) => {
              const Icon = item.icon;
              const label = ts(item.messageKey);
              return (
                <CommandItem
                  key={item.href}
                  value={`${label} ${item.href} ${item.cmdkKeywords}`}
                  keywords={item.cmdkKeywords.split(/\s+/).filter(Boolean)}
                  onSelect={() => {
                    run(item.href);
                  }}
                >
                  <Icon className="text-muted-foreground" aria-hidden />
                  {label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading={ts("groupMarketing")}>
            {appShellMarketingNav.map((item) => {
              const Icon = item.icon;
              const label = ts(item.messageKey);
              return (
                <CommandItem
                  key={item.href}
                  value={`${label} ${item.href}`}
                  onSelect={() => {
                    run(item.href);
                  }}
                >
                  <Icon className="text-muted-foreground" aria-hidden />
                  {label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("commandPaletteAccountGroup")}>
            <CommandItem
              value={`${t("userMenuProfile")} /profile`}
              onSelect={() => {
                run("/profile");
              }}
            >
              <User className="text-muted-foreground" aria-hidden />
              {t("userMenuProfile")}
            </CommandItem>
            <CommandItem
              value={`${t("userMenuSettings")} /settings`}
              onSelect={() => {
                run("/settings");
              }}
            >
              <Settings className="text-muted-foreground" aria-hidden />
              {t("userMenuSettings")}
            </CommandItem>
            <CommandItem
              value={`${t("notificationsLinkAria")} /notifications`}
              onSelect={() => {
                run("/notifications");
              }}
            >
              <Inbox className="text-muted-foreground" aria-hidden />
              {t("notificationsLinkAria")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <p className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
          {t("commandPaletteFooterHint")}
        </p>
      </Command>
    </CommandDialog>
  );
}
