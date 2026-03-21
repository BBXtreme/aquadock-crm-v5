/**
 * Utility functions for bullet-proof data handling in AquaDock CRM.
 * All functions handle null/undefined inputs safely.
 */

/**
 * Formats a number as currency in German locale (Euro).
 * Handles null/undefined by defaulting to 0.
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "€1.234,56")
 */
export function formatCurrency(value: number | null | undefined): string {
  return `€${Number(value ?? 0).toLocaleString('de-DE')}`;
}

/**
 * Formats a date string as a relative distance from now.
 * Handles null/undefined by returning '—'.
 * @param date - The date string to format
 * @returns Relative time string (e.g., "2 days ago") or '—' if invalid
 */
export function formatDateDistance(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '—';
  }
}

/**
 * Safely converts a string, handling null/undefined by returning '—'.
 * @param str - The string to process
 * @returns The original string or '—' if null/undefined
 */
export function safeString(str: string | null | undefined): string {
  return str ?? '—';
}

/**
 * Central error handler for Supabase operations.
 * @param error - The error object
 * @param context - Context string for logging
 * @returns A standardized Error object
 */
export function handleSupabaseError(error: unknown, context: string): Error {
  console.error(`Supabase error in ${context}:`, error);
  if (error instanceof Error) {
    return new Error(`Database error: ${error.message}`);
  }
  return new Error('An unknown database error occurred');
}

// Import here to avoid circular dependencies
import { formatDistanceToNow } from 'date-fns';
