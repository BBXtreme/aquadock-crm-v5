"use client";

import {
  Anchor,
  BarChart3,
  Building,
  ChevronDown,
  FileText,
  Mail,
  MapPin,
  PanelLeft,
  PanelRight,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  user: { role: string; display_name?: string | null };
}

export default function Sidebar({ isCollapsed, onToggle, user }: SidebarProps) {
  const pathname = usePathname();
  const _router = useRouter();

  const userRole = user.role;

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Companies", href: "/companies", icon: Building },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Timeline", href: "/timeline", icon: FileText },
    { name: "Reminders", href: "/reminders", icon: Anchor },
    { name: "OpenMap", href: "/openmap", icon: MapPin },
    { name: "Mass Email", href: "/mass-email", icon: Mail, adminOnly: true },
    { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
  ];

  const filteredNavigation = navigation.filter((item) => !item.adminOnly || userRole === "admin");

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-center px-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="border-b flex-shrink-0" />

      <nav className={cn("flex-1 space-y-1 p-4", !isCollapsed && "overflow-y-auto")}>
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
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
                {!isCollapsed && item.adminOnly && (
                  <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0.5">
                    Admin
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="border-t flex-shrink-0" />

      {!isCollapsed && (
        <div className="p-4 flex-shrink-0">
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

      <div className="border-t flex-shrink-0" />

      <div className="p-4 flex justify-center flex-shrink-0">
        <Badge variant="outline" className="text-xs">
          {APP_VERSION}
        </Badge>
      </div>
    </div>
  );
}
