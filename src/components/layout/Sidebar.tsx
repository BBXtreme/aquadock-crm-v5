// src/components/layout/Sidebar.tsx
"use client";

import { ChevronDown, type LucideIcon, PanelLeft, PanelRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CHANGELOG_LAST_SEEN_STORAGE_KEY, CHANGELOG_SEEN_EVENT } from "@/content/changelog";
import { compareSemver } from "@/lib/changelog/compare-semver";
import {
  type AppShellNavMessageKey,
  appShellMarketingNav,
  appShellQuickCreate,
  appShellSalesNav,
} from "@/lib/constants/app-shell-navigation";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import packageJson from "../../../package.json";

/** shadcn/ui Sidebar primitives (aligned with registry markup/classes; local to avoid CLI overwrites). */
function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear outline-none focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  user: { role: string; display_name?: string | null };
}

function SidebarChangelogVersionLink({ version }: { version: string }) {
  const tChangelog = useT("changelog");
  const [showUnread, setShowUnread] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        const last = window.localStorage.getItem(CHANGELOG_LAST_SEEN_STORAGE_KEY);
        const cmp = compareSemver(version, last ?? "");
        setShowUnread(last === null || last === "" || cmp === null || cmp === 1);
      } catch {
        setShowUnread(true);
      }
    };
    refresh();
    window.addEventListener(CHANGELOG_SEEN_EVENT, refresh);
    return () => window.removeEventListener(CHANGELOG_SEEN_EVENT, refresh);
  }, [version]);

  return (
    <Link
      href="/changelog"
      className="relative inline-flex max-w-full min-w-0 items-center text-xs text-muted-foreground underline-offset-2 hover:underline"
      aria-label={tChangelog("sidebarVersionAria")}
      title={showUnread ? tChangelog("sidebarUnreadHint") : undefined}
    >
      <span className="truncate tabular-nums">{version}</span>
      {showUnread ? (
        <span
          className="absolute -right-2 -top-1 size-2 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

function renderNavItems(
  items: readonly { messageKey: AppShellNavMessageKey; href: string; icon: LucideIcon }[],
  pathname: string,
  isCollapsed: boolean,
  label: (key: AppShellNavMessageKey) => string,
) {
  return items.map((item) => {
    const isActive = pathname === item.href;
    return (
      <SidebarMenuItem key={item.href}>
        <Link href={item.href}>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start h-10 px-3 transition-colors",
              isCollapsed && "px-2 justify-center",
              isActive && "bg-secondary text-secondary-foreground shadow-sm",
            )}
            title={isCollapsed ? label(item.messageKey) : undefined}
          >
            <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && (
              <span className="flex-1 text-left truncate">{label(item.messageKey)}</span>
            )}
          </Button>
        </Link>
      </SidebarMenuItem>
    );
  });
}

export default function Sidebar({ isCollapsed, onToggle, user }: SidebarProps) {
  const pathname = usePathname();
  const t = useT("layout.sidebar");

  const _userRole = user.role;

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
          aria-label={isCollapsed ? t("toggleExpand") : t("toggleCollapse")}
        >
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className={cn("flex flex-1 flex-col gap-4 p-4 overflow-y-auto")} suppressHydrationWarning={true}>
        <SidebarGroup className="gap-1">
          {!isCollapsed ? <SidebarGroupLabel>{t("groupSales")}</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(appShellSalesNav, pathname, isCollapsed, t)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="gap-1">
          {!isCollapsed ? <SidebarGroupLabel>{t("groupMarketing")}</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(appShellMarketingNav, pathname, isCollapsed, t)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </nav>

      <div className="border-t shrink-0" />

      {!isCollapsed && (
        <div className="p-4 shrink-0">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start h-10 px-3">
                <span className="flex-1 text-left">{t("quickActions")}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pt-2">
              {appShellQuickCreate.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
                      <Icon className="h-4 w-4 mr-2 shrink-0 text-foreground/75" aria-hidden />
                      {t(item.messageKey)}
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <div className="border-t shrink-0" />

      <div className={cn("p-4 flex shrink-0", isCollapsed ? "flex-col items-center space-y-2" : "justify-between")}>
        <Badge variant="outline" className="text-xs capitalize">
          {user.role}
        </Badge>
        <SidebarChangelogVersionLink version={packageJson.version} />
      </div>
    </div>
  );
}
