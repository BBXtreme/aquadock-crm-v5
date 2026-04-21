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
      comment_attachments: {
        Row: {
          byte_size: number | null
          comment_id: string
          content_type: string | null
          created_at: string
          created_by: string
          file_name: string
          id: string
          storage_object_path: string
        }
        Insert: {
          byte_size?: number | null
          comment_id: string
          content_type?: string | null
          created_at?: string
          created_by: string
          file_name: string
          id?: string
          storage_object_path: string
        }
        Update: {
          byte_size?: number | null
          comment_id?: string
          content_type?: string | null
          created_at?: string
          created_by?: string
          file_name?: string
          id?: string
          storage_object_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body_markdown: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          entity_id: string
          entity_type: string
          id: string
          parent_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_markdown: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id: string
          entity_type?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_markdown?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          bundesland: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
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
          search_embedding: string | null
          search_vector: unknown
          stadt: string | null
          status: string
          strasse: string | null
          telefon: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          value: number | null
          wasserdistanz: number | null
          wassertyp: string | null
          website: string | null
        }
        Insert: {
          bundesland?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          search_embedding?: string | null
          search_vector?: unknown
          stadt?: string | null
          status?: string
          strasse?: string | null
          telefon?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          value?: number | null
          wasserdistanz?: number | null
          wassertyp?: string | null
          website?: string | null
        }
        Update: {
          bundesland?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          search_embedding?: string | null
          search_vector?: unknown
          stadt?: string | null
          status?: string
          strasse?: string | null
          telefon?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          value?: number | null
          wasserdistanz?: number | null
          wassertyp?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          anrede: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
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
          updated_by: string | null
          user_id: string | null
          vorname: string
        }
        Insert: {
          anrede?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          updated_by?: string | null
          user_id?: string | null
          vorname: string
        }
        Update: {
          anrede?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          updated_by?: string | null
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
      feedback: {
        Row: {
          body: string
          created_at: string
          id: string
          page_url: string | null
          screenshot_path: string | null
          screenshot_url: string | null
          sentiment: string
          topic: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          page_url?: string | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          sentiment: string
          topic: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          page_url?: string | null
          screenshot_path?: string | null
          screenshot_url?: string | null
          sentiment?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_users: {
        Row: {
          auth_user_id: string
          chosen_role: string | null
          decline_reason: string | null
          display_name: string | null
          email: string
          email_confirmed_at: string | null
          id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          chosen_role?: string | null
          decline_reason?: string | null
          display_name?: string | null
          email: string
          email_confirmed_at?: string | null
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          chosen_role?: string | null
          decline_reason?: string | null
          display_name?: string | null
          email?: string
          email_confirmed_at?: string | null
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_users_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_sign_in_at: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_sign_in_at?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sign_in_at?: string | null
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
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_by?: string | null
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
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          title: string
          updated_by: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          title: string
          updated_by?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          title?: string
          updated_by?: string | null
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
          {
            foreignKeyName: "timeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          actor_user_id: string | null
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          payload: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      hybrid_company_search: {
        Args: {
          p_fts_weight?: number
          p_match_count?: number
          p_max_vector_distance?: number
          p_query: string
          p_query_embedding: string
          p_rrf_k?: number
          p_vector_weight?: number
        }
        Returns: {
          company_id: string
          fts_rank: number
          rrf_score: number
          vector_rank: number
        }[]
      }
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
