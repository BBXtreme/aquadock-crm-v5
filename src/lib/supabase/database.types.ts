// Database type definitions for Supabase
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
          nachname?: string;
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
          assigned_to: string;
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
        };
        Insert: {
          company_id?: string | null;
          activity_type: string;
          title: string;
          content?: string | null;
          user_name: string;
          created_at?: string | null;
          user_id?: string | null;
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
        };
      };
      email_log: {
        Row: {
          id: string;
          recipient_email: string;
          subject: string;
          body: string;
          status: string;
          sent_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          recipient_email: string;
          subject: string;
          body: string;
          status?: string;
          sent_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_email?: string;
          subject?: string;
          body?: string;
          status?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [key in never]: never;
    };
  };
}

// Export table types
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
export type TimelineEntry = Database["public"]["Tables"]["timeline"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
