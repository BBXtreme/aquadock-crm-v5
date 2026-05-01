"use client";

import { Settings2, User } from "lucide-react";

import ProfileSecuritySection from "@/components/features/profile/ProfileSecuritySection";
import { ProfileSignOutButton } from "@/components/features/profile/ProfileSignOutButton";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-translations";
import { safeDisplay } from "@/lib/utils/data-format";
import type { Profile } from "@/types/database.types";

export type ProfilePageViewProps = {
  profileRow: Profile;
  user: { display_name: string | null; email: string | null; id: string };
};

export function ProfilePageView({ profileRow, user }: ProfilePageViewProps) {
  const t = useT("profile");
  const tc = useT("common");

  const displayName = safeDisplay(
    profileRow.display_name ?? user.display_name ?? "",
  );
  const email =
    user.email === null || user.email === undefined ? "" : user.email;

  const emailLocalPart =
    user.email === null || user.email === undefined
      ? ""
      : (() => {
          const parts = user.email.split("@");
          const first = parts[0];
          return first === undefined ? "" : first;
        })();

  const role =
    profileRow.role === null || profileRow.role === undefined
      ? "user"
      : profileRow.role;

  return (
    <>
      <section
        aria-labelledby="profile-page-title"
        className="space-y-2 border-b border-border/40 pb-6"
      >
        <h1
          id="profile-page-title"
          className="bg-linear-to-r from-primary to-primary/70 bg-clip-text font-bold text-3xl text-transparent tracking-tight"
        >
          {t("pageTitle")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("pageWelcome", {
            displayName:
              displayName === "" ? t("overviewNoDisplayName") : displayName,
          })}
        </p>
      </section>

      <section aria-labelledby="profile-overview-heading">
        <h2 id="profile-overview-heading" className="sr-only">
          {t("overviewSectionSrOnly")}
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="gap-2 border-border/40 border-b px-6 pb-5">
              <CardTitle className="flex items-center text-xl">
                <User className="mr-3 h-6 w-6 text-primary" />
                {t("overviewCardTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-8 pt-6">
              <div className="flex flex-col items-center space-y-5">
                <div className="w-full max-w-sm">
                  <AvatarUpload
                    userId={user.id}
                    displayName={
                      profileRow.display_name === null ||
                      profileRow.display_name === undefined
                        ? safeDisplay(emailLocalPart, "")
                        : profileRow.display_name
                    }
                    initialAvatarUrl={profileRow.avatar_url}
                  />
                </div>
                <div className="space-y-1 text-center">
                  <p className="font-semibold text-2xl">
                    {displayName === ""
                      ? t("overviewNoDisplayName")
                      : displayName}
                  </p>
                  <p className="text-muted-foreground">{email}</p>
                  <Badge variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                </div>
                <div className="w-full space-y-1 border-border/40 border-t pt-4 text-center">
                  <p className="text-muted-foreground text-xs">
                    <span className="font-medium">{tc("metaCreated")}</span>{" "}
                    {profileRow.created_at === null ||
                    profileRow.created_at === undefined
                      ? t("metaNotAvailable")
                      : new Date(profileRow.created_at).toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <span className="font-medium">{tc("metaUpdated")}</span>{" "}
                    {profileRow.updated_at === null ||
                    profileRow.updated_at === undefined
                      ? t("metaNotAvailable")
                      : new Date(profileRow.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <section
                className="border-border/40 border-t pt-6"
                aria-label={t("accountActionsAriaLabel")}
              >
                <ProfileSignOutButton className="w-full justify-center" />
              </section>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="gap-2 border-border/40 border-b px-6 pb-5">
              <CardTitle className="flex items-center font-heading text-xl">
                <Settings2
                  className="mr-3 h-6 w-6 shrink-0 text-primary"
                  aria-hidden
                />
                {t("editCardTitle")}
              </CardTitle>
              <CardDescription className="max-w-prose text-pretty text-muted-foreground text-sm leading-relaxed">
                {t("editCardDescription")}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-8 pt-6">
              <section aria-label={t("editSectionAriaLabel")}>
                <ProfileSecuritySection
                  currentEmail={email}
                  profile={profileRow}
                />
              </section>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
