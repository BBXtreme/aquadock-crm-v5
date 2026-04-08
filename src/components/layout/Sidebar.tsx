// src/components/layout/Sidebar.tsx
"use client";

import {
  BarChart3,
  Bell,
  ChevronDown,
  History,
  Mail,
  MapPin,
  PanelLeft,
  PanelRight,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const salesNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Reminders", href: "/reminders", icon: Bell },
  { name: "Companies", href: "/companies", icon: Target },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Timeline", href: "/timeline", icon: History },
  { name: "OpenMap", href: "/openmap", icon: MapPin },
] as const;

const marketingNavigation = [
  { name: "Mass Email", href: "/mass-email", icon: Mail },
  { name: "Brevo Campaigns", href: "/brevo", icon: Mail },
] as const;

function renderNavItems(
  items: readonly { name: string; href: string; icon: typeof BarChart3 }[],
  pathname: string,
  isCollapsed: boolean,
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
          >
            <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && (
              <span className="flex-1 text-left truncate">{item.name}</span>
            )}
          </Button>
        </Link>
      </SidebarMenuItem>
    );
  });
}

export default function Sidebar({ isCollapsed, onToggle, user }: SidebarProps) {
  const pathname = usePathname();
  const _router = useRouter();

  const _userRole = user.role;

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className={cn("flex flex-1 flex-col gap-4 p-4 overflow-y-auto")} suppressHydrationWarning={true}>
        <SidebarGroup className="gap-1">
          {!isCollapsed ? <SidebarGroupLabel>Sales</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(salesNavigation, pathname, isCollapsed)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="gap-1">
          {!isCollapsed ? <SidebarGroupLabel>Marketing</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(marketingNavigation, pathname, isCollapsed)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </nav>

      <div className="border-t shrink-0" />

      {!isCollapsed && (
        <div className="p-4 shrink-0">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start h-10 px-3">
                <span className="flex-1 text-left">Quick Actions</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pt-2">
              <Link href="/companies?create=true">
                <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
                  New Company
                </Button>
              </Link>
              <Link href="/contacts?create=true">
                <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
                  New Contact
                </Button>
              </Link>
              <Link href="/reminders?create=true">
                <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
                  New Reminder
                </Button>
              </Link>
              <Link href="/timeline?create=true">
                <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
                  New Timeline
                </Button>
              </Link>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <div className="border-t shrink-0" />

      <div className={cn("p-4 flex shrink-0", isCollapsed ? "flex-col items-center space-y-2" : "justify-between")}>
        <Badge variant="outline" className="text-xs capitalize">
          {user.role}
        </Badge>
        <span className="text-xs text-muted-foreground">{packageJson.version}</span>
      </div>
    </div>
  );
}
