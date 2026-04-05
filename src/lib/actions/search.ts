// src/lib/actions/search.ts
"use server";

import { handleSupabaseError } from "@/lib/supabase/error-handling";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validations/search";

interface SelectedCompany {
  id: string;
  firmenname: string;
  stadt: string | null;
  kundentyp: string;
  status: string;
  rank: number;
}

interface SelectedContact {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  position: string | null;
  rank: number;
}

interface SelectedReminder {
  id: string;
  title: string;
  description: string | null;
}

interface SelectedTimelineEntry {
  id: string;
  title: string;
  content: string | null;
  activity_type: string;
}

export interface SearchResult {
  type: "company" | "contact" | "reminder" | "timeline";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export async function performGlobalSearch(formData: FormData): Promise<SearchResult[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const validated = searchQuerySchema.parse({
    query: formData.get("query"),
  });
  const query = validated.query;

  const { data: tsQuery, error: tsQueryError } = await supabase.rpc('websearch_to_tsquery', { query });
  if (tsQueryError) throw handleSupabaseError(tsQueryError);

  const results: SearchResult[] = [];

  // Companies: full-text with rank
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select(`id, firmenname, stadt, kundentyp, status, ts_rank(search_vector, '${tsQuery}') as rank`)
    .eq("user_id", user.id)
    .order("rank", { ascending: false })
    .limit(20);

  if (companiesError) throw handleSupabaseError(companiesError);
  (companies as unknown as SelectedCompany[])?.forEach((c: SelectedCompany) => {
    results.push({
      type: "company",
      id: c.id,
      title: c.firmenname,
      subtitle: `${c.stadt || "—"}, ${c.kundentyp}, ${c.status}`,
      url: `/companies/${c.id}`,
    });
  });

  // Contacts: full-text with rank
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select(`id, vorname, nachname, email, position, ts_rank(search_vector, '${tsQuery}') as rank`)
    .or(`user_id.eq.${user.id},company_id.in.(select id from companies where user_id = ${user.id})`)
    .order("rank", { ascending: false })
    .limit(20);

  if (contactsError) throw handleSupabaseError(contactsError);
  (contacts as unknown as SelectedContact[])?.forEach((c: SelectedContact) => {
    results.push({
      type: "contact",
      id: c.id,
      title: `${c.vorname} ${c.nachname}`,
      subtitle: `${c.position || "—"}, ${c.email || "—"}`,
      url: `/contacts/${c.id}`,
    });
  });

  // Reminders: ilike
  const { data: reminders, error: remindersError } = await supabase
    .from("reminders")
    .select("id, title, description")
    .or(`user_id.eq.${user.id},company_id.in.(select id from companies where user_id = ${user.id})`)
    .ilike("title", `%${query}%`)
    .or(`ilike("description", "%${query}%")`)
    .limit(20);

  if (remindersError) throw handleSupabaseError(remindersError);
  reminders?.forEach((r: SelectedReminder) => {
    results.push({
      type: "reminder",
      id: r.id,
      title: r.title,
      subtitle: r.description || "—",
      url: `/reminders?id=${r.id}`,
    });
  });

  // Timeline: ilike
  const { data: timeline, error: timelineError } = await supabase
    .from("timeline")
    .select("id, title, content, activity_type")
    .or(`user_id.eq.${user.id},company_id.in.(select id from companies where user_id = ${user.id})`)
    .ilike("title", `%${query}%`)
    .or(`ilike("content", "%${query}%")`)
    .limit(20);

  if (timelineError) throw handleSupabaseError(timelineError);
  timeline?.forEach((t: SelectedTimelineEntry) => {
    results.push({
      type: "timeline",
      id: t.id,
      title: t.title,
      subtitle: `${t.activity_type}, ${t.content || "—"}`,
      url: `/timeline?id=${t.id}`,
    });
  });

  return results.slice(0, 20);
}
