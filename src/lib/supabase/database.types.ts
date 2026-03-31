// src/lib/supabase/database.types.ts
// Database type definitions for Supabase
// Generated based on the provided schema - March 2026

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          firmenname: string;
          rechtsform: string | null;
          kundentyp: string;
          firmentyp: string | null;
          strasse: string | null;
          plz: string | null;
          stadt: string | null;
          bundesland: string | null;
          land: string;
          website: string | null;
          telefon: string | null;
          email: string | null;
          wasserdistanz: number | null;
          wassertyp: string | null;
          lat: number | null;
          lon: number | null;
          osm: string | null;
          import_batch: string | null;
          status: string;
          value: number | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          firmenname: string;
          rechtsform?: string | null;
          kundentyp?: string;
          firmentyp?: string | null;
          strasse?: string | null;
          plz?: string | null;
          stadt?: string | null;
          bundesland?: string | null;
          land?: string;
          website?: string | null;
          telefon?: string | null;
          email?: string | null;
          wasserdistanz?: number | null;
          wassertyp?: string | null;
          lat?: number | null;
          lon?: number | null;
          osm?: string | null;
          import_batch?: string | null;
          status?: string;
          value?: number | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          firmenname?: string;
          rechtsform?: string | null;
          kundentyp?: string;
          firmentyp?: string | null;
          strasse?: string | null;
          plz?: string | null;
          stadt?: string | null;
          bundesland?: string | null;
          land?: string;
          website?: string | null;
          telefon?: string | null;
          email?: string | null;
          wasserdistanz?: number | null;
          wassertyp?: string | null;
          lat?: number | null;
          lon?: number | null;
          osm?: string | null;
          import_batch?: string | null;
          status?: string;
          value?: number | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
      };
      contacts: {
        Row: {
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
        };
        Insert: {
          company_id?: string | null;
          anrede?: string | null;
          vorname: string;
          nachname: string;
          position?: string | null;
          email?: string | null;
          telefon?: string | null;
          mobil?: string | null;
          durchwahl?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          anrede?: string | null;
          vorname?: string;
          nachname: string;
          position?: string | null;
          email?: string | null;
          telefon?: string | null;
          mobil?: string | null;
          durchwahl?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
      };
      email_log: {
        Row: {
          id: string;
          template_name: string | null;
          recipient_email: string;
          recipient_name: string | null;
          subject: string;
          status: string;
          error_msg: string | null;
          sent_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          template_name?: string | null;
          recipient_email: string;
          recipient_name?: string | null;
          subject: string;
          status?: string;
          error_msg?: string | null;
          sent_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          template_name?: string | null;
          recipient_email?: string;
          recipient_name?: string | null;
          subject?: string;
          status?: string;
          error_msg?: string | null;
          sent_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          body: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          name: string;
          subject: string;
          body: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          body?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: "user" | "admin";
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "user" | "admin";
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "user" | "admin";
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
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
        };
        Insert: {
          company_id: string;
          title: string;
          description?: string | null;
          due_date: string;
          priority?: string;
          status?: string;
          assigned_to?: string;
          created_at?: string | null;
          completed_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string;
          priority?: string;
          status?: string;
          assigned_to?: string;
          created_at?: string | null;
          completed_at?: string | null;
          user_id?: string | null;
        };
      };
      timeline: {
        Row: {
          id: string;
          company_id: string | null;
          activity_type: string;
          title: string;
          content: string | null;
          user_name: string;
          created_at: string | null;
          user_id: string | null;
          contact_id: string | null;
        };
        Insert: {
          company_id?: string | null;
          activity_type: string;
          title: string;
          content?: string | null;
          user_name?: string;
          created_at?: string | null;
          user_id?: string | null;
          contact_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          activity_type?: string;
          title?: string;
          content?: string | null;
          user_name?: string;
          created_at?: string | null;
          user_id?: string | null;
          contact_id?: string | null;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          value: unknown;           // jsonb in DB → unknown in TS
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          key: string;
          value: unknown;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          key?: string;
          value?: unknown;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Export common types
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
export type TimelineEntry = Database["public"]["Tables"]["timeline"]["Row"];
export type UserSetting = Database["public"]["Tables"]["user_settings"]["Row"];

export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];
export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
export type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];
export type EmailLogInsert = Database["public"]["Tables"]["email_log"]["Insert"];
export type EmailLogUpdate = Database["public"]["Tables"]["email_log"]["Update"];
export type EmailTemplateInsert = Database["public"]["Tables"]["email_templates"]["Insert"];
export type EmailTemplateUpdate = Database["public"]["Tables"]["email_templates"]["Update"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type ReminderInsert = Database["public"]["Tables"]["reminders"]["Insert"];
export type ReminderUpdate = Database["public"]["Tables"]["reminders"]["Update"];
export type TimelineEntryInsert = Database["public"]["Tables"]["timeline"]["Insert"];
export type TimelineEntryUpdate = Database["public"]["Tables"]["timeline"]["Update"];
export type UserSettingInsert = Database["public"]["Tables"]["user_settings"]["Insert"];
export type UserSettingUpdate = Database["public"]["Tables"]["user_settings"]["Update"];

// Additional app types
export type KPI = {
  title: string;
  value: string | number;
  changePercent: number;
  subtitle: string;
};

export type TimelineEntryWithJoins = TimelineEntry & {
  companies?: Pick<Company, "firmenname"> | null;
  contacts?: Pick<Contact, "vorname" | "nachname" | "position"> | null;
};
