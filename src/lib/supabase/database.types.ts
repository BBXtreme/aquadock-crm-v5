export type Database = {
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
          land: string | null;
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
          id?: string;
          firmenname: string;
          rechtsform?: string | null;
          kundentyp: string;
          firmentyp?: string | null;
          strasse?: string | null;
          plz?: string | null;
          stadt?: string | null;
          bundesland?: string | null;
          land?: string | null;
          website?: string | null;
          telefon?: string | null;
          email?: string | null;
          wasserdistanz?: number | null;
          wassertyp?: string | null;
          lat?: number | null;
          lon?: number | null;
          osm?: string | null;
          import_batch?: string | null;
          status: string;
          value?: number | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          firmenname?: string;
          rechtsform?: string | null;
          kundentyp?: string;
          firmentyp?: string | null;
          strasse?: string | null;
          plz?: string | null;
          stadt?: string | null;
          bundesland?: string | null;
          land?: string | null;
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
          id?: string;
          company_id?: string | null;
          anrede?: string | null;
          vorname: string;
          nachname: string;
          position?: string | null;
          email?: string | null;
          telefon?: string | null;
          mobil?: string | null;
          durchwahl?: string | null;
          is_primary: boolean;
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
          id?: string;
          company_id: string;
          title: string;
          description?: string | null;
          due_date: string;
          priority: string;
          status: string;
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
      email_log: {
        Row: {
          id: string;
          template_name: string | null;
          recipient_email: string;
          recipient_name: string | null;
          subject: string | null;
          status: string;
          error_msg: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          template_name?: string | null;
          recipient_email: string;
          recipient_name?: string | null;
          subject?: string | null;
          status: string;
          error_msg?: string | null;
          sent_at: string;
        };
        Update: {
          id?: string;
          template_name?: string | null;
          recipient_email?: string;
          recipient_name?: string | null;
          subject?: string | null;
          status?: string;
          error_msg?: string | null;
          sent_at?: string;
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
          id?: string;
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
          id?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Company = Tables<'companies'>;
export type Contact = Tables<'contacts'>;
export type Reminder = Tables<'reminders'>;
export type EmailLog = Tables<'email_log'>;
export type EmailTemplate = Tables<'email_templates'>;
export type TimelineEntry = Tables<'timeline'>;
