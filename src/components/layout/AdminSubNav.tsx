"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appShellAdminNav } from "@/lib/constants/app-shell-navigation";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

export function AdminSubNav() {
  const pathname = usePathname();
  const ts = useT("layout.sidebar");

  return (
    <nav
      aria-label={ts("groupAdmin")}
      className="flex flex-wrap gap-2 border-b border-border/40 pb-4"
    >
      {appShellAdminNav.map((item) => {
        const label = ts(item.messageKey);
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-md px-3 py-2 font-medium text-sm transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
