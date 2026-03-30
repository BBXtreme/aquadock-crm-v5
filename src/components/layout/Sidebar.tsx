"use client";

import {
  Anchor,
  BarChart3,
  Building,
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  MapPin,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role on mount
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        } else {
          setUserRole("user"); // Default to user
        }
      } catch {
        setUserRole("user"); // Default to user on error
      }
    };
    fetchRole();
  }, []);

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
      <div className="flex h-16 items-center justify-center px-4">
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      <div className="border-b" />

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
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

      <div className="border-t" />

      <div className="p-4">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start h-10 px-3">
              <span className="flex-1 text-left">Quick Actions</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-2">
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
              New Company
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
              New Contact
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-3">
              New Reminder
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="border-t" />

      <div className="p-4 flex justify-center">
        <Badge variant="outline" className="text-xs">
          v1.0.0
        </Badge>
      </div>
    </div>
  );
}
