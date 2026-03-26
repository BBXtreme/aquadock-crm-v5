"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1, "Port is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  from_email: z.string().email("Valid email is required"),
  from_name: z.string().min(1, "From name is required"),
});

type SmtpForm = z.infer<typeof smtpSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("user_settings").select("*").single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "not found"
      return data || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const smtpMutation = useMutation({
    mutationFn: async (values: SmtpForm) => {
      const supabase = createClient();
      const { error } = await supabase.from("user_settings").upsert({
        id: "default", // Assuming single user settings
        smtp_host: values.host,
        smtp_port: values.port,
        smtp_username: values.username,
        smtp_password: values.password,
        smtp_from_email: values.from_email,
        smtp_from_name: values.from_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("SMTP settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save SMTP settings", { description: error.message });
    },
  });

  const tagGroups: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(settings)) {
    const groupKey = key.split("_")[0];
    tagGroups[groupKey] = tagGroups[groupKey] || [];
    tagGroups[groupKey].push(value);
  }

  const smtpForm = useForm<SmtpForm>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: (settings.smtp_host as string) || "",
      port: (settings.smtp_port as number) || 587,
      username: (settings.smtp_username as string) || "",
      password: (settings.smtp_password as string) || "",
      from_email: (settings.smtp_from_email as string) || "",
      from_name: (settings.smtp_from_name as string) || "",
    },
  });

  const onSmtpSubmit = smtpForm.handleSubmit((data) => {
    smtpMutation.mutate(data);
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* SMTP Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...smtpForm}>
            <form onSubmit={onSmtpSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={smtpForm.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="from_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={smtpForm.control}
                  name="from_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={smtpMutation.isPending}>
                {smtpMutation.isPending ? "Saving..." : "Save SMTP Settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* OpenMap Settings */}
      <Card>
        <CardHeader>
          <CardTitle>OpenMap Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>OpenMap configuration options will be added here.</p>
        </CardContent>
      </Card>

      {/* Other Settings */}
      {Object.entries(tagGroups).map(([group, values]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{group.charAt(0).toUpperCase() + group.slice(1)} Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside">
              {values.map((value, index) => (
                <li key={index}>{value}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
