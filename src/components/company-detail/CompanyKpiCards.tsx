"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/lib/supabase/database.types";

interface Props {
  company: Company;
}

export default function CompanyKpiCards({ company }: Props) {
  // KPI calculations (same as your original)
  const totalContacts = 0; // replace with real query data if needed
  const primaryContacts = 0;
  const openReminders = 0;
  const overdueReminders = 0;

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
