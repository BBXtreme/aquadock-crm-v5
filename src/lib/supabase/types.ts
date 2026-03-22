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
        };
        Insert: Partial<Database["public"]["Tables"]["companies"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["companies"]["Row"]>;
      };

      contacts: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          email: string | null;
          telefon: string | null;
          is_primary: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
      };

      reminders: {
        Row: {
          id: string;
          company_id: string | null;
          title: string;
          description: string | null;
          due_date: string;
          status: string;
          priority: string;
          assigned_to: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["reminders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["reminders"]["Row"]>;
      };

      timeline: {
        Row: {
          id: string;
          company_id: string | null;
          contact_id: string | null;
          title: string;
          description: string | null;
          event_date: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["timeline"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["timeline"]["Row"]>;
      };

      email_log: {
        Row: {
          id: string;
          recipient_email: string;
          subject: string;
          content: string;
          status: string;
          sent_at: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["email_log"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["email_log"]["Row"]>;
      };

      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          content: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["email_templates"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Row"]>;
      };

      user_settings: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          value: unknown; // jsonb – e.g. string[] for column order
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          key: string;
          value: unknown;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
      };
    };
    // biome-ignore lint/complexity/noBannedTypes: Supabase generated type
    Views: {};
    // biome-ignore lint/complexity/noBannedTypes: Supabase generated type
    Functions: {};
    // biome-ignore lint/complexity/noBannedTypes: Supabase generated type
    Enums: {};
  };
}

// Export table types
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
export type TimelineEntry = Database["public"]["Tables"]["timeline"]["Row"] & {
  companies?: Pick<Company, "id" | "firmenname"> | null;
};
export type TimelineEntryInsert = Database["public"]["Tables"]["timeline"]["Insert"];
export type TimelineEntryUpdate = Database["public"]["Tables"]["timeline"]["Update"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type EmailLogInsert = Database["public"]["Tables"]["email_log"]["Insert"];
export type EmailLogUpdate = Database["public"]["Tables"]["email_log"]["Update"];
export type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
export type EmailTemplateInsert = Database["public"]["Tables"]["email_templates"]["Insert"];
export type EmailTemplateUpdate = Database["public"]["Tables"]["email_templates"]["Update"];
export type UserSetting = Database["public"]["Tables"]["user_settings"]["Row"];
export type UserSettingInsert = Database["public"]["Tables"]["user_settings"]["Insert"];
export type UserSettingUpdate = Database["public"]["Tables"]["user_settings"]["Update"];
