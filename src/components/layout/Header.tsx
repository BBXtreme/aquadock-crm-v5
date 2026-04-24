// src/components/layout/Header.tsx
// This component implements the header of the application, including the logo, command menu (⌘K / Ctrl+K), theme toggle, reminders notifications, and user menu. It uses React Query to fetch reminder counts and Next.js features for routing and theming.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, Inbox, LogOut, Monitor, Moon, Settings, Sun, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FeedbackButton from "@/components/features/feedback/FeedbackButton";
import { AppCommandMenu } from "@/components/layout/AppCommandMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { performBrowserSignOutToLogin } from "@/lib/auth/browser-sign-out";
import type { AuthUser } from "@/lib/auth/types";
import { useCommandPaletteModLabel } from "@/lib/hooks/use-command-palette-mod-label";
import { useT } from "@/lib/i18n/use-translations";
import { useInAppNotificationsRealtime } from "@/lib/realtime/in-app-notifications-realtime";
import { getUnreadCount } from "@/lib/services/in-app-notifications";
import { saveAppearanceTheme } from "@/lib/services/user-settings";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { safeDisplay } from "@/lib/utils/data-format";
import { appearanceThemeSchema } from "@/lib/validations/appearance";

const PLACEHOLDER_AVATAR_SRC = "/placeholder-avatar.png";

function headerAvatarInitials(displayName: string | null, email: string | null): string {
  const label = (displayName?.trim() || email?.split("@")[0]?.trim() || "").trim();
  if (label.length === 0) {
    return "?";
  }
  const parts = label.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (first !== undefined && last !== undefined) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
  }
  return label.slice(0, 2).toUpperCase();
}

type HeaderProps = {
  user: AuthUser;
};

const THEME_ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export default function Header({ user }: HeaderProps) {
  const t = useT("layout");
  const ts = useT("settings");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const commandPaletteModLabel = useCommandPaletteModLabel();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeMutation = useMutation({
    mutationFn: saveAppearanceTheme,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appearance-settings"] });
      toast.success(ts("appearance.themeSaved"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : ts("common.unknownError");
      toast.error(ts("appearance.themeSaveErrorTitle"), { description: message });
    },
  });

  const handleThemeChange = (value: string) => {
    const parsed = appearanceThemeSchema.safeParse(value);
    if (parsed.success) {
      setTheme(parsed.data);
      themeMutation.mutate(parsed.data);
    }
  };

  const ThemeTriggerIcon =
    mounted && theme ? THEME_ICON[theme as keyof typeof THEME_ICON] ?? Monitor : Monitor;

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
        .is("deleted_at", null)
        .eq("status", "open")
        .gte("due_date", startOfWeek.toISOString())
        .lte("due_date", endOfWeek.toISOString());
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: inAppUnreadCount = 0 } = useQuery({
    queryKey: ["in-app-notifications-unread", user.id],
    queryFn: () => getUnreadCount(createClient(), user.id),
    staleTime: 60_000,
  });

  const { data: overdueRemindersCount = 0 } = useQuery({
    queryKey: ["reminders-count-overdue"],
    queryFn: async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "open")
        .lt("due_date", new Date().toISOString());
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  useInAppNotificationsRealtime(user.id, queryClient);

  // Radix DropdownMenuItem uses pointer handlers that block native <form> submit on
  // the slotted button. Sign out via the browser Supabase client, then hard-navigate
  // so middleware and RSC see cleared cookies (same outcome as the server action).
  const handleHeaderSignOut = () => {
    void performBrowserSignOutToLogin();
  };

  const avatarAlt = safeDisplay(user.display_name ?? user.email?.split("@")[0] ?? "", "User");
  const avatarSrc =
    user.avatar_url && user.avatar_url.length > 0 ? user.avatar_url : PLACEHOLDER_AVATAR_SRC;
  const avatarFallback = headerAvatarInitials(user.display_name, user.email);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-md transition-shadow",
        isScrolled ? "shadow-md" : "shadow-none",
      )}
    >
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <div className="flex h-22 w-22 items-center justify-center transition-transform hover:scale-105 md:h-26 md:w-26">
            <Image
              src={mounted && resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
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

      <div className="flex items-center space-x-4">
        {overdueRemindersCount > 0 && (
          <Link href="/reminders?status=overdue">
            <Button type="button" variant="ghost" className="relative" aria-label={t("reminderOverdueLinkAria")}>
              <Clock className="h-4 w-4" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs"
              >
                {overdueRemindersCount}
              </Badge>
            </Button>
          </Link>
        )}

        {openRemindersCount > 0 && (
          <Link href="/reminders?status=open">
            <Button type="button" variant="ghost" className="relative" aria-label={t("reminderThisWeekLinkAria")}>
              <CalendarDays className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs">
                {openRemindersCount}
              </Badge>
            </Button>
          </Link>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="gap-0 px-2 font-mono text-sm leading-none tabular-nums text-muted-foreground hover:text-foreground"
              aria-label={t("commandPaletteTriggerAria")}
              aria-keyshortcuts="Control+K Meta+K"
              onClick={() => setCommandOpen(true)}
            >
              {commandPaletteModLabel}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[min(20rem,calc(100vw-2rem))] text-balance" sideOffset={6}>
            {t("commandPaletteSearchButtonTooltip")}
          </TooltipContent>
        </Tooltip>
        <AppCommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

        <FeedbackButton userId={user.id} />

        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link href="/notifications">
            <Button type="button" variant="ghost" className="relative" aria-label={t("notificationsLinkAria")}>
              <Inbox className="h-4 w-4" />
              {inAppUnreadCount > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-border/60 bg-background/75 p-0 px-0.5 text-xs font-semibold leading-none tabular-nums text-foreground shadow-sm backdrop-blur-md",
                    "dark:border-border/50 dark:bg-background/55",
                  )}
                >
                  {inAppUnreadCount > 99 ? "99+" : inAppUnreadCount}
                </Badge>
              )}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={ts("appearance.themeLabel")}
                suppressHydrationWarning={true}
              >
                <ThemeTriggerIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32">
              <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                <DropdownMenuRadioItem value="light" className="gap-2">
                  <Sun className="h-4 w-4 shrink-0" />
                  {ts("appearance.themeLight")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="gap-2">
                  <Moon className="h-4 w-4 shrink-0" />
                  {ts("appearance.themeDark")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="gap-2">
                  <Monitor className="h-4 w-4 shrink-0" />
                  {ts("appearance.themeSystem")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full">
                <Avatar>
                  <AvatarImage src={avatarSrc} alt={avatarAlt} />
                  <AvatarFallback className="text-xs font-medium">{avatarFallback}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  {t("userMenuProfile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  {t("userMenuSettings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  handleHeaderSignOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
