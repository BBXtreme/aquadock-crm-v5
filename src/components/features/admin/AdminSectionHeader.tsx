"use client";

import { useT } from "@/lib/i18n/use-translations";

type AdminSection = "users" | "trash" | "feedback" | "partnerApplications";

const SECTION_KEYS: Record<
  AdminSection,
  {
    descriptionKey:
      | "feedbackDescription"
      | "trashDescription"
      | "usersDescription"
      | "partnerApplicationsDescription";
    titleKey:
      | "feedbackTitle"
      | "trashTitle"
      | "usersTitle"
      | "partnerApplicationsTitle";
  }
> = {
  feedback: { titleKey: "feedbackTitle", descriptionKey: "feedbackDescription" },
  trash: { titleKey: "trashTitle", descriptionKey: "trashDescription" },
  users: { titleKey: "usersTitle", descriptionKey: "usersDescription" },
  partnerApplications: {
    titleKey: "partnerApplicationsTitle",
    descriptionKey: "partnerApplicationsDescription",
  },
};

export function AdminSectionHeader({ section }: { section: AdminSection }) {
  const t = useT("admin");
  const keys = SECTION_KEYS[section];

  return (
    <header className="space-y-2 border-b border-border/40 pb-6">
      <h1 className="bg-linear-to-r from-primary to-primary/70 bg-clip-text font-bold text-3xl text-transparent tracking-tight">
        {t(keys.titleKey)}
      </h1>
      <p className="text-lg text-muted-foreground">{t(keys.descriptionKey)}</p>
    </header>
  );
}
