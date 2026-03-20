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
}

export interface Contact {
  id: string;
  vorname: string;
  nachname: string;
  company_id: string;
  position: string;
  email: string;
  telefon: string;
  primary: boolean;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  company_id: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
  created_at: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  sent_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface TimelineEntry {
  id: string;
  company_id: string | null;
  activity_type: string;
  title: string;
  content: string;
  created_at: string;
}
