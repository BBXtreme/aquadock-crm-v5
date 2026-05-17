// src/components/features/profile/RoleMultiSelect.tsx
//
// Compact multi-role checkbox group used by the admin user-management UI.
// Keeps the visual rhythm of a single Select while writing the canonical
// multi-role payload backed by `public.user_roles`.

"use client";

import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { USER_ROLES, type UserRole } from "@/lib/auth/types";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

interface RoleMultiSelectProps {
  value: readonly UserRole[];
  onChange: (next: UserRole[]) => void;
  disabled?: boolean;
  /** When set, the named role cannot be unchecked (used to protect "self admin"). */
  pinnedRole?: UserRole;
  ariaLabel?: string;
  className?: string;
  /** Compact inline layout vs. block layout for dialogs. */
  layout?: "inline" | "block";
  size?: "sm" | "md";
}

export function RoleMultiSelect({
  value,
  onChange,
  disabled = false,
  pinnedRole,
  ariaLabel,
  className,
  layout = "inline",
  size = "md",
}: RoleMultiSelectProps) {
  const t = useT("settings.userManagement");
  const idBase = useId();

  const toggle = (role: UserRole, checked: boolean) => {
    if (pinnedRole === role && !checked) {
      return;
    }
    const next = new Set(value);
    if (checked) {
      next.add(role);
    } else {
      next.delete(role);
    }
    onChange(Array.from(next).sort() as UserRole[]);
  };

  return (
    <fieldset
      className={cn(
        "m-0 min-w-0 border-0 p-0",
        layout === "inline"
          ? "flex flex-wrap items-center gap-3"
          : "flex flex-col gap-2",
        className,
      )}
    >
      <legend className="sr-only">{ariaLabel ?? t("rolesGroupAria")}</legend>
      {USER_ROLES.map((role) => {
        const id = `${idBase}-role-${role}`;
        const checked = value.includes(role);
        const isPinned = pinnedRole === role && checked;
        const labelKey: `role${Capitalize<UserRole>}` =
          `role${role.charAt(0).toUpperCase()}${role.slice(1)}` as never;
        return (
          <Label
            key={role}
            htmlFor={id}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 font-normal",
              size === "sm" ? "text-xs" : "text-sm",
              isPinned && "text-muted-foreground",
            )}
          >
            <Checkbox
              id={id}
              checked={checked}
              disabled={disabled || isPinned}
              onCheckedChange={(state) => toggle(role, state === true)}
            />
            <span>{t(labelKey)}</span>
          </Label>
        );
      })}
    </fieldset>
  );
}
