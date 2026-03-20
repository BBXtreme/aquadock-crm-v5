import { Database } from "./database.types";

// Re-export types for convenience, including joined data
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = {
  id: string;
  company_id: string | null;
  anrede: string | null;
  vorname: string;
  nachname: string;
  position: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  durchwahl: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  companies?: { firmenname: string };
};
export type Reminder = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
  created_at: string | null;
  completed_at: string | null;
  user_id: string | null;
  companies?: { firmenname: string };
};
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type EmailTemplate =
  Database["public"]["Tables"]["email_templates"]["Row"];
export type TimelineEntry = {
  id: string;
  company_id: string | null;
  activity_type: string;
  title: string;
  content: string | null;
  user_name: string;
  created_at: string | null;
  user_id: string | null;
  companies?: { firmenname: string };
};
