import { createServerSupabaseClient } from '../client';
import type { TimelineEntry, TimelineEntryInsert, TimelineEntryUpdate } from '../database.types';

/**
 * Get all timeline entries with joined company data
 */
export async function getTimeline(client = createServerSupabaseClient()): Promise<TimelineEntry[]> {
  const { data, error } = await client.from('timeline').select('*, companies(firmenname)');
  if (error) throw new Error(`Failed to fetch timeline: ${error.message}`);
  return data ?? [];
}

/**
 * Get timeline entry by ID
 */
export async function getTimelineEntryById(id: string, client = createServerSupabaseClient()): Promise<TimelineEntry | null> {
  const { data, error } = await client.from('timeline').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch timeline entry: ${error.message}`);
  return data ?? null;
}

/**
 * Create a new timeline entry
 */
export async function createTimelineEntry(entry: TimelineEntryInsert, client = createServerSupabaseClient()): Promise<TimelineEntry> {
  const { data, error } = await client.from('timeline').insert(entry).select().single();
  if (error) throw new Error(`Failed to create timeline entry: ${error.message}`);
  return data;
}

/**
 * Update a timeline entry
 */
export async function updateTimelineEntry(id: string, updates: TimelineEntryUpdate, client = createServerSupabaseClient()): Promise<TimelineEntry> {
  const { data, error } = await client.from('timeline').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update timeline entry: ${error.message}`);
  return data;
}

/**
 * Delete a timeline entry
 */
export async function deleteTimelineEntry(id: string, client = createServerSupabaseClient()): Promise<void> {
  const { error } = await client.from('timeline').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete timeline entry: ${error.message}`);
}
