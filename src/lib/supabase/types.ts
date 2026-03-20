import { Database } from './database.types';

// Re-export types for convenience
export type Company = Database['public']['Tables']['companies']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type EmailLog = Database['public']['Tables']['email_log']['Row'];
export type EmailTemplate = Database['public']['Tables']['email_templates']['Row'];
export type TimelineEntry = Database['public']['Tables']['timeline']['Row'];
