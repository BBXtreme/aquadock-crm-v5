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
  isMobile: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, _isMobile, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role on mount
  useEffect(() => {
    const fetchRole = async () => {
      try {
        // TODO: Replace with actual auth query or context
        // For now, simulate fetching role
        const response = await fetch("/api/auth/me"); // Assume an endpoint to get user
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
        "flex h-full flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-primary" />
            <span className="font-semibold">AquaDock CRM</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 w-8 p-0">
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      <div className="border-b" />

      <nav className="flex-1 space-y-1 p-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isCollapsed && "px-2",
                  isActive && "bg-secondary text-secondary-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.adminOnly && <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>}
                  </>
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
            <Button variant="ghost" className="w-full justify-start">
              <span className="flex-1 text-left">Quick Actions</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-2">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              New Company
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              New Contact
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              New Reminder
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
