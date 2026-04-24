import {
  BarChart3,
  Bell,
  Building2,
  History,
  ListPlus,
  Mail,
  MapPin,
  Target,
  UserPlus,
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

/**
 * “Schnellaktionen” / new-record deep links — shared by [Sidebar](src/components/layout/Sidebar.tsx)
 * and [AppCommandMenu](src/components/layout/AppCommandMenu.tsx). URLs must stay aligned with list
 * pages that read `create=true` (see `ClientCompaniesPage`, contacts, reminders, timeline clients).
 *
 * `cmdkKeywords` — extra tokens for the command palette filter (English + German) so typing
 * “create”, “neu”, “lead”, etc. still matches when the UI label is localized.
 */
export const appShellQuickCreate = [
  {
    messageKey: "newCompany",
    href: "/companies?create=true",
    icon: Building2,
    cmdkKeywords: "create new company unternehmen lead account firm tvrtka",
  },
  {
    messageKey: "newContact",
    href: "/contacts?create=true",
    icon: UserPlus,
    cmdkKeywords: "create new contact kontakt person osoba",
  },
  {
    messageKey: "newReminder",
    href: "/reminders?create=true",
    icon: Bell,
    cmdkKeywords: "create new reminder erinnerung task follow up podsjetnik",
  },
  {
    messageKey: "newTimeline",
    href: "/timeline?create=true",
    icon: ListPlus,
    cmdkKeywords: "create new timeline aktivität activity history note log zapis događaj",
  },
] as const;

export type AppShellNavMessageKey =
  | (typeof appShellSalesNav)[number]["messageKey"]
  | (typeof appShellMarketingNav)[number]["messageKey"];

export type AppShellQuickCreateMessageKey = (typeof appShellQuickCreate)[number]["messageKey"];
