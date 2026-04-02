export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          bundesland: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          firmenname: string
          firmentyp: string | null
          id: string
          import_batch: string | null
          kundentyp: string
          land: string | null
          lat: number | null
          lon: number | null
          notes: string | null
          osm: string | null
          plz: string | null
          rechtsform: string | null
          search_vector: unknown
          stadt: string | null
          status: string
          strasse: string | null
          telefon: string | null
          updated_at: string | null
          user_id: string | null
          value: number | null
          wasserdistanz: number | null
          wassertyp: string | null
          website: string | null
        }
        Insert: {
          bundesland?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          firmenname: string
          firmentyp?: string | null
          id?: string
          import_batch?: string | null
          kundentyp?: string
          land?: string | null
          lat?: number | null
          lon?: number | null
          notes?: string | null
          osm?: string | null
          plz?: string | null
          rechtsform?: string | null
          search_vector?: unknown
          stadt?: string | null
          status?: string
          strasse?: string | null
          telefon?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          wasserdistanz?: number | null
          wassertyp?: string | null
          website?: string | null
        }
        Update: {
          bundesland?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          firmenname?: string
          firmentyp?: string | null
          id?: string
          import_batch?: string | null
          kundentyp?: string
          land?: string | null
          lat?: number | null
          lon?: number | null
          notes?: string | null
          osm?: string | null
          plz?: string | null
          rechtsform?: string | null
          search_vector?: unknown
          stadt?: string | null
          status?: string
          strasse?: string | null
          telefon?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          wasserdistanz?: number | null
          wassertyp?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          anrede: string | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          durchwahl: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          mobil: string | null
          nachname: string
          notes: string | null
          position: string | null
          search_vector: unknown
          telefon: string | null
          updated_at: string | null
          user_id: string | null
          vorname: string
        }
        Insert: {
          anrede?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          durchwahl?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          mobil?: string | null
          nachname: string
          notes?: string | null
          position?: string | null
          search_vector?: unknown
          telefon?: string | null
          updated_at?: string | null
          user_id?: string | null
          vorname: string
        }
        Update: {
          anrede?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          durchwahl?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          mobil?: string | null
          nachname?: string
          notes?: string | null
          position?: string | null
          search_vector?: unknown
          telefon?: string | null
          updated_at?: string | null
          user_id?: string | null
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          batch_id: string | null
          created_at: string | null
          error_msg: string | null
          id: string
          mode: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          spam_score: number | null
          status: string | null
          subject: string | null
          template_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          error_msg?: string | null
          id?: string
          mode?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          spam_score?: number | null
          status?: string | null
          subject?: string | null
          template_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          error_msg?: string | null
          id?: string
          mode?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          spam_score?: number | null
          status?: string | null
          subject?: string | null
          template_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          priority: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline: {
        Row: {
          activity_type: string
          company_id: string | null
          contact_id: string | null
          content: string | null
          created_at: string | null
          id: string
          title: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          title: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          user_id: string
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
