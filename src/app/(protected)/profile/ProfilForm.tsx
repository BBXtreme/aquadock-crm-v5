"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/supabase/database.types";
import { updateDisplayName } from "./page";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const displayNameSchema = z.object({
  display_name: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
});

type DisplayNameForm = z.infer<typeof displayNameSchema>;

function ProfileForm({ profile }: { profile: Profile }) {
  const form = useForm<DisplayNameForm>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      display_name: profile?.display_name ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (display_name: string) => {
      const formData = new FormData();
      formData.append('display_name', display_name);
      return updateDisplayName(formData);
    },
    onSuccess: () => {
      toast.success("Display name updated successfully");
      form.reset({ display_name: form.getValues("display_name") });
    },
    onError: (_error) => {
      toast.error("Failed to update display name");
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data.display_name);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
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
          <Input id="profilePicture" type="file" accept="image/*" disabled className="h-11" />
          <p className="text-muted-foreground text-sm">Upload functionality coming soon</p>
        </div>
        <Button type="submit" className="w-full h-11 bg-[#24BACC] text-white hover:bg-[#1da0a8] transition-colors" disabled={mutation.isPending}>
          {mutation.isPending ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </Form>
  );
}

export default ProfileForm;
