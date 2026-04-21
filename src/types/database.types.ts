// src/types/database.types.ts
// Barrel file + helper types for CRM v5
// → Always run `pnpm run supabase:types` first when the database schema changes

import type { Database as SupabaseDatabase } from "@/types/supabase";

// Re-export the full generated Database (single source of truth)
export type Database = SupabaseDatabase;

// =============================================================================
// Core Table Row Types (Clean aliases)
// =============================================================================
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type CommentAttachment = Database["public"]["Tables"]["comment_attachments"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PendingUser = Database["public"]["Tables"]["pending_users"]["Row"];
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
export type TimelineEntry = Database["public"]["Tables"]["timeline"]["Row"];
export type UserSetting = Database["public"]["Tables"]["user_settings"]["Row"];
export type UserNotification = Database["public"]["Tables"]["user_notifications"]["Row"];

// =============================================================================
// Insert & Update Types (Critical for forms and Server Actions)
// =============================================================================
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];
export type CommentUpdate = Database["public"]["Tables"]["comments"]["Update"];
export type CommentAttachmentInsert = Database["public"]["Tables"]["comment_attachments"]["Insert"];
export type CommentAttachmentUpdate = Database["public"]["Tables"]["comment_attachments"]["Update"];

export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
export type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

export type EmailLogInsert = Database["public"]["Tables"]["email_log"]["Insert"];
export type EmailLogUpdate = Database["public"]["Tables"]["email_log"]["Update"];

export type EmailTemplateInsert = Database["public"]["Tables"]["email_templates"]["Insert"];
export type EmailTemplateUpdate = Database["public"]["Tables"]["email_templates"]["Update"];

export type FeedbackInsert = Database["public"]["Tables"]["feedback"]["Insert"];

export type PendingUserInsert = Database["public"]["Tables"]["pending_users"]["Insert"];
export type PendingUserUpdate = Database["public"]["Tables"]["pending_users"]["Update"];

export type ReminderInsert = Database["public"]["Tables"]["reminders"]["Insert"];
export type ReminderUpdate = Database["public"]["Tables"]["reminders"]["Update"];

export type TimelineEntryInsert = Database["public"]["Tables"]["timeline"]["Insert"];
export type TimelineEntryUpdate = Database["public"]["Tables"]["timeline"]["Update"];

export type UserSettingInsert = Database["public"]["Tables"]["user_settings"]["Insert"];
export type UserSettingUpdate = Database["public"]["Tables"]["user_settings"]["Update"];

export type UserNotificationInsert = Database["public"]["Tables"]["user_notifications"]["Insert"];
export type UserNotificationUpdate = Database["public"]["Tables"]["user_notifications"]["Update"];

// =============================================================================
// App-specific Extended / Joined Types
// =============================================================================
export type TimelineEntryWithJoins = TimelineEntry & {
  companies?: Pick<Company, "id" | "firmenname" | "status" | "kundentyp"> | null;
  contacts?: Pick<Contact, "id" | "vorname" | "nachname" | "position" | "email"> | null;
  profiles?: Pick<Profile, "display_name"> | null;
};

/** Comment row with author fields for list UI (Supabase join on profiles). */
export type CommentWithAuthor = Comment & {
  profiles?: Pick<Profile, "display_name" | "avatar_url"> | null;
};

export type CompanyWithPrimaryContact = Company & {
  primary_contact?: Contact | null;
};

// =============================================================================
// Common UI / Domain Types
// =============================================================================
export type KPI = {
  title: string;
  value: string | number;
  changePercent: number;
  subtitle: string;
};

export type UserRole = "user" | "admin";

// =============================================================================
// Utility Types (Optional but useful)
// =============================================================================
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Re-export Json type for convenience
export type Json = SupabaseDatabase["public"]["Tables"]["user_settings"]["Row"]["value"];
