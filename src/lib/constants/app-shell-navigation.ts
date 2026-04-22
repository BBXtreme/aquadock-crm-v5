import {
  BarChart3,
  Bell,
  History,
  Mail,
  MapPin,
  Target,
  Users,
} from "lucide-react";

/**
 * Primary CRM nav — shared by [Sidebar](src/components/layout/Sidebar.tsx) and the ⌘K command menu.
 * Keep `messageKey` values in sync with `layout.sidebar` in `src/messages/*.json`.
 */
export const appShellSalesNav = [
  { messageKey: "dashboard", href: "/dashboard", icon: BarChart3 },
  { messageKey: "openmap", href: "/openmap", icon: MapPin },
  { messageKey: "reminders", href: "/reminders", icon: Bell },
  { messageKey: "companies", href: "/companies", icon: Target },
  { messageKey: "contacts", href: "/contacts", icon: Users },
  { messageKey: "timeline", href: "/timeline", icon: History },
] as const;

export const appShellMarketingNav = [
  { messageKey: "massEmail", href: "/mass-email", icon: Mail },
  { messageKey: "brevoCampaigns", href: "/brevo", icon: Mail },
] as const;

export type AppShellNavMessageKey =
  | (typeof appShellSalesNav)[number]["messageKey"]
  | (typeof appShellMarketingNav)[number]["messageKey"];
