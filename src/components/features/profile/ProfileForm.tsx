// src/components/features/profile/ProfileForm.tsx
// Client Component for Profile Form
// This component renders a form for updating the user's display name and uploading a profile picture (upload functionality is not implemented yet).
// It uses React Hook Form for form state management and Zod for validation. The form includes loading states and displays success or error toasts based on the outcome of the update operation.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName } from "@/lib/services/profile";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const displayNameSchema = z.object({
  display_name: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
});

type DisplayNameForm = z.infer<typeof displayNameSchema>;

export default function ProfilForm({ profile }: { profile: Profile }) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<DisplayNameForm>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      display_name: profile?.display_name ?? "",
    },
  });

  const onSubmit = async (data: DisplayNameForm) => {
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("display_name", data.display_name);
      await updateDisplayName(formData);
      toast.success("Display name updated successfully");
      form.reset({ display_name: data.display_name });
    } catch (_error) {
      toast.error("Failed to update display name");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Display Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter your display name"
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <Label htmlFor="profilePicture" className="text-sm font-medium">Profile Picture</Label>
          <Input 
            id="profilePicture" 
            type="file" 
            accept="image/*" 
            disabled 
            className="h-11" 
          />
          <p className="text-muted-foreground text-sm">Upload functionality coming soon</p>
        </div>

        <Button 
          type="submit" 
          className="w-full h-11 bg-[#24BACC] text-white hover:bg-[#1da0a8] transition-colors" 
          disabled={isPending}
        >
          {isPending ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </Form>
  );
}