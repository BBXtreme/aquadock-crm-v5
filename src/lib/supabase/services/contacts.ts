import { createServerSupabaseClient } from '../client';
import type { Contact, ContactInsert, ContactUpdate } from '../database.types';

export async function getContacts(): Promise<Contact[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('contacts').select('*');
  if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
  return data ?? [];
}

export async function getContactById(id: string): Promise<Contact | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch contact: ${error.message}`);
  return data ?? null;
}

export async function createContact(contact: ContactInsert): Promise<Contact> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('contacts').insert(contact).select().single();
  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return data;
}

export async function updateContact(id: string, updates: ContactUpdate): Promise<Contact> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update contact: ${error.message}`);
  return data;
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
}
