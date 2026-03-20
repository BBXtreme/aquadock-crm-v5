export interface Company {
  id: string;
  firmenname: string;
  kundentyp: string;
  status: string;
  value: number;
  stadt: string;
  land: string;
  wasserdistanz?: number;
  wassertyp?: string;
  lat?: number;
  lon?: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface Contact {
  id: string;
  company_id?: string;
  anrede?: string;
  vorname: string;
  nachname: string;
  position?: string;
  email?: string;
  telefon?: string;
  mobil?: string;
  durchwahl?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface Reminder {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
  created_at: string;
  completed_at?: string;
  user_id?: string;
}

export interface EmailLog {
  id: string;
  template_name?: string;
  recipient_email: string;
  recipient_name?: string;
  subject?: string;
  status: string;
  error_msg?: string;
  sent_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  id: string;
  company_id?: string;
  activity_type: string;
  title: string;
  content?: string;
  user_name: string;
  created_at: string;
  user_id?: string;
}
