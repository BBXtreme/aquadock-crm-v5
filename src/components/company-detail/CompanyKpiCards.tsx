"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import type { Company } from "@/types/database.types";

interface Props {
  company: Company;
}

export default function CompanyKpiCards({ company }: Props) {
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", company.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("contacts").select("id, is_primary").eq("company_id", company.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", company.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("id, status, due_date")
        .eq("company_id", company.id);
      if (error) throw error;
      return data;
    },
  });

  const totalContacts = contacts.length;
  const primaryContacts = contacts.filter((c) => c.is_primary).length;
  const openReminders = reminders.filter((r) => r.status === "open").length;
  const overdueReminders = reminders.filter((r) => r.status === "open" && new Date(r.due_date) < new Date()).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalContacts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Primary Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{primaryContacts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Open Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openReminders}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Overdue Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{overdueReminders}</div>
        </CardContent>
      </Card>
    </div>
  );
}
