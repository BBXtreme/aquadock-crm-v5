import { createServerSupabaseClient } from '../client';
import type { Contact, ContactInsert, ContactUpdate } from '../database.types';

export async function getContacts(client = createServerSupabaseClient()): Promise<Contact[]> {
  const { data, error } = await client.from('contacts').select('*');
  if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
  return data ?? [];
}

export async function getContactById(id: string, client = createServerSupabaseClient()): Promise<Contact | null> {
  const { data, error } = await client.from('contacts').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch contact: ${error.message}`);
  return data ?? null;
}

export async function createContact(contact: ContactInsert, client = createServerSupabaseClient()): Promise<Contact> {
  const { data, error } = await client.from('contacts').insert(contact).select().single();
  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return data;
}

export async function updateContact(id: string, updates: ContactUpdate, client = createServerSupabaseClient()): Promise<Contact> {
  const { data, error } = await client.from('contacts').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update contact: ${error.message}`);
  return data;
}

export async function deleteContact(id: string, client = createServerSupabaseClient()): Promise<void> {
  const { error } = await client.from('contacts').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
}
