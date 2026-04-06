// src/components/layout/Header.tsx
// This component implements the header of the application, including the logo, search (placeholder dialog), theme toggle, reminders notifications, and user menu. It uses React Query to fetch reminder counts and Next.js features for routing and theming.

"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Moon, Plus, Search, Settings, Sun, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/browser";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const _router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reminder calculations (Monday–Sunday week)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
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
    staleTime: 5 * 60 * 1000,
  });

  const { data: overdueRemindersCount = 0 } = useQuery({
    queryKey: ["reminders-count-overdue"],
    queryFn: async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("status", "open")
        .lt("due_date", new Date().toISOString());
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border flex h-14 items-center justify-between p-0.5 pr-5 ${
        isScrolled ? "shadow-md" : "shadow-sm"
      }`}
    >
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <div className="ml-5 flex h-22 w-22 items-center justify-center transition-transform hover:scale-105 md:h-26 md:w-26">
            <Image
              src={mounted && theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="AquaDock CRM"
              width={0}
              height={0}
              sizes="(max-width: 768px) 88px, (max-width: 1024px) 104px"
              className="h-22 w-auto object-contain md:h-26"
              priority
              suppressHydrationWarning={true}
            />
          </div>
        </Link>
      </div>

      <div className="mx-4 flex min-w-0 flex-1 items-center justify-center md:max-w-md">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Search">
              <Search className="h-4 w-4" aria-hidden />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Global search</AlertDialogTitle>
              <AlertDialogDescription>
                This isn&apos;t built yet — we&apos;ll add a proper global search here when it&apos;s ready.
                Until then, jump in via the sidebar or the list pages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Got it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex items-center space-x-4">
        <Link href="/timeline?create=true">
          <Button variant="ghost" size="icon" aria-label="Create new timeline entry">
            <Plus className="h-4 w-4" />
          </Button>
        </Link>

        {overdueRemindersCount > 0 && (
          <Link href="/reminders?status=overdue">
            <Button variant="ghost" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs bg-red-500 text-white">
                {overdueRemindersCount}
              </Badge>
            </Button>
          </Link>
        )}

        {openRemindersCount > 0 && (
          <Link href="/reminders?status=open">
            <Button variant="ghost" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs">
                {openRemindersCount}
              </Badge>
            </Button>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          suppressHydrationWarning={true}
        >
          {mounted && (theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.png" alt="User" />
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
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
