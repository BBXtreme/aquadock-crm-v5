export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          /** Unique identifier for the company */
          id: string;
          /** Official company name */
          firmenname: string;
          /** Legal form of the company (e.g., GmbH, AG) */
          rechtsform: string | null;
          /** Customer type (e.g., hotels-resorts, marinas, camping, sonstige) */
          kundentyp: string;
          /** Company type (additional classification) */
          firmentyp: string | null;
          /** Street address */
          strasse: string | null;
          /** Postal code */
          plz: string | null;
          /** City */
          stadt: string | null;
          /** Federal state */
          bundesland: string | null;
          /** Country */
          land: string | null;
          /** Website URL */
          website: string | null;
          /** Phone number */
          telefon: string | null;
          /** Email address */
          email: string | null;
          /** Distance to water in kilometers */
          wasserdistanz: number | null;
          /** Type of water body (e.g., sea, lake) */
          wassertyp: string | null;
          /** Latitude coordinate */
          lat: number | null;
          /** Longitude coordinate */
          lon: number | null;
          /** OpenStreetMap reference */
          osm: string | null;
          /** Batch identifier for imports */
          import_batch: string | null;
          /** Status of the company (possible values: 'lead', 'won', 'lost', 'sonstige') */
          status: string;
          /** Estimated project value in Euro */
          value: number | null;
          /** Additional notes */
          notes: string | null;
          /** Creation timestamp in ISO format */
          created_at: string | null;
          /** Last update timestamp in ISO format */
          updated_at: string | null;
          /** User ID associated with the record */
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
          /** Unique identifier for the contact */
          id: string;
          /** Company ID this contact belongs to */
          company_id: string | null;
          /** Salutation (e.g., Herr, Frau) */
          anrede: string | null;
          /** First name */
          vorname: string;
          /** Last name */
          nachname: string;
          /** Job position */
          position: string | null;
          /** Email address */
          email: string | null;
          /** Phone number */
          telefon: string | null;
          /** Mobile phone number */
          mobil: string | null;
          /** Extension number */
          durchwahl: string | null;
          /** Whether this is the primary contact */
          is_primary: boolean;
          /** Additional notes */
          notes: string | null;
          /** Creation timestamp in ISO format */
          created_at: string | null;
          /** Last update timestamp in ISO format */
          updated_at: string | null;
          /** User ID associated with the record */
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
          /** Unique identifier for the reminder */
          id: string;
          /** Company ID this reminder is associated with */
          company_id: string;
          /** Title of the reminder */
          title: string;
          /** Description of the reminder */
          description: string | null;
          /** Due date in ISO format */
          due_date: string;
          /** Priority level (possible values: 'high', 'normal', 'low') */
          priority: string;
          /** Status of the reminder (possible values: 'open', 'closed') */
          status: string;
          /** Person assigned to the reminder */
          assigned_to: string;
          /** Creation timestamp in ISO format */
          created_at: string | null;
          /** Completion timestamp in ISO format */
          completed_at: string | null;
          /** User ID associated with the record */
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
          /** Unique identifier for the email log entry */
          id: string;
          /** Template name used for the email */
          template_name: string | null;
          /** Recipient email address */
          recipient_email: string;
          /** Recipient name */
          recipient_name: string | null;
          /** Email subject */
          subject: string | null;
          /** Status of the email (possible values: 'sent', 'failed', etc.) */
          status: string;
          /** Error message if sending failed */
          error_msg: string | null;
          /** Timestamp when email was sent in ISO format */
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
          /** Unique identifier for the email template */
          id: string;
          /** Name of the template */
          name: string;
          /** Email subject */
          subject: string;
          /** Email body content */
          body: string;
          /** Creation timestamp in ISO format */
          created_at: string | null;
          /** Last update timestamp in ISO format */
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
          /** Unique identifier for the timeline entry */
          id: string;
          /** Company ID this entry is associated with (nullable for global events) */
          company_id: string | null;
          /** Type of activity (e.g., 'email', 'call', 'meeting') */
          activity_type: string;
          /** Title of the timeline entry */
          title: string;
          /** Content or description of the entry */
          content: string | null;
          /** Name of the user who performed the action */
          user_name: string;
          /** Creation timestamp in ISO format */
          created_at: string | null;
          /** User ID associated with the record */
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
