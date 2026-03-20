/**
 * Debug utility for Supabase queries - logs only in development
 */
export function debugQuery(label: string, data: any) {
  if (process.env.NODE_ENV === "development") {
    console.group(`🔍 Supabase Debug: ${label}`);
    console.log("Data:", data);
    console.groupEnd();
  }
}
