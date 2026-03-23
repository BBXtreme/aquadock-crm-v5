"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { Bell, Moon, Search, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate start and end of current week (Monday to Sunday)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: openRemindersCount = 0 } = useQuery({
    queryKey: ["reminders-count-this-week"],
    queryFn: async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("status", "open")
        .gte("due_date", startOfWeek.toISOString())
        .lte("due_date", endOfWeek.toISOString());
      return count || 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <header className={`sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border flex h-14 items-center justify-between p-0.5 pr-5 ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <div className="ml-5 flex h-22 w-22 items-center justify-center transition-transform hover:scale-105 md:h-26 md:w-26">
            <Image
              src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="AquaDock CRM"
              width={0}
              height={0}
              sizes="(max-width: 768px) 88px, 104px"
              className="h-22 w-auto object-contain md:h-26"
              priority
            />
          </div>
        </Link>
        <span className="font-semibold text-lg">CRM v5.0.1</span>
      </div>
      <div className="mx-4 max-w-md flex-1">
        <div className="relative">
          <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {openRemindersCount > 0 && (
          <Link href="/reminders">
            <Button variant="ghost" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs">
                {openRemindersCount}
              </Badge>
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
