import { Database } from "./database.types";

// Re-export types for convenience, including joined data
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"] & {
  companies?: { firmenname: string };
};
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"] & {
  companies?: { firmenname: string };
};
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type EmailTemplate =
  Database["public"]["Tables"]["email_templates"]["Row"];
export type TimelineEntry = Database["public"]["Tables"]["timeline"]["Row"] & {
  companies?: { firmenname: string };
};
