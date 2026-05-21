"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-translations";
import { contactKeys, reminderKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/browser";
import type { Company } from "@/types/database.types";

interface Props {
  company: Company;
}

export default function CompanyKpiCards({ company }: Props) {
  const t = useT("companies");
  // Phase 2 §4.3 — `contactKeys.kpi(id)` is intentionally distinct from
  // `contactKeys.byCompany(id)` (used by LinkedContactsCard with a richer
  // projection). Pre-Phase-2 the bare `["contacts", id]` collided across both
  // call sites and silently produced wrong shapes in whichever cache wrote
  // last.
  const { data: contacts = [] } = useQuery({
    queryKey: contactKeys.kpi(company.id),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, is_primary")
        .eq("company_id", company.id)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  // Same rationale as the contacts split: `reminderKeys.kpi(id)` !==
  // `reminderKeys.byCompany(id)`.
  const { data: reminders = [] } = useQuery({
    queryKey: reminderKeys.kpi(company.id),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("id, status, due_date")
        .eq("company_id", company.id)
        .is("deleted_at", null);
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
          <CardTitle className="text-sm">{t("detailKpiTotalContacts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalContacts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("detailKpiPrimaryContacts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{primaryContacts}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("detailKpiOpenReminders")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openReminders}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("detailKpiOverdueReminders")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{overdueReminders}</div>
        </CardContent>
      </Card>
    </div>
  );
}
