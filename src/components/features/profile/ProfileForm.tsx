// src/components/features/profile/ProfileForm.tsx
// Client Component for Profile Form
// This component renders a form for updating the user's display name.
// It uses React Hook Form for form state management and Zod for validation. The form includes loading states and displays success or error toasts based on the outcome of the update operation.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/use-translations";
import { updateDisplayName } from "@/lib/services/profile";
import {
  type ProfileDisplayNameForm,
  profileDisplayNameSchema,
} from "@/lib/validations/profile";
import type { Profile } from "@/types/database.types";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const t = useT("profile");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ProfileDisplayNameForm>({
    resolver: zodResolver(profileDisplayNameSchema),
    defaultValues: {
      display_name:
        profile.display_name === null || profile.display_name === undefined
          ? ""
          : profile.display_name,
    },
  });

  const onSubmit = async (data: ProfileDisplayNameForm) => {
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("display_name", data.display_name);
      await updateDisplayName(formData);
      toast.success(t("toastDisplayNameUpdated"));
      form.reset({ display_name: data.display_name });
    } catch (_error) {
      toast.error(t("toastDisplayNameUpdateFailed"));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control as Control<ProfileDisplayNameForm>}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium leading-none">
                {t("displayNameLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t("displayNamePlaceholder")}
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={isPending}
        >
          {isPending ? t("updateProfilePending") : t("updateProfileButton")}
        </Button>
      </form>
    </Form>
  );
}
