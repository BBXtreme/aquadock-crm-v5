# AquaDock CRM Supabase Schema

## Tables

### companies
- id: string (primary key)
- firmenname: string
- kundentyp: string
- status: string (lead, won, lost, etc.)
- value: number
- stadt: string
- land: string
- wasserdistanz: number (optional)
- wassertyp: string (optional)
- lat: number (optional)
- lon: number (optional)
- created_at: string (timestamp)

### contacts
- id: string (primary key)
- vorname: string
- nachname: string
- company_id: string (foreign key to companies.id)
- position: string
- email: string
- telefon: string
- primary: boolean
- created_at: string (timestamp)

### reminders
- id: string (primary key)
- title: string
- company_id: string (foreign key to companies.id)
- due_date: string (date)
- priority: string (high, medium, low)
- status: string (open, closed)
- assigned_to: string
- created_at: string (timestamp)

### email_log
- id: string (primary key)
- recipient: string
- subject: string
- body: string
- status: string (sent, failed, etc.)
- sent_at: string (timestamp)

### email_templates
- id: string (primary key)
- name: string
- subject: string
- body: string

### timeline
- id: string (primary key)
- company_id: string | null (foreign key to companies.id, nullable for global events)
- activity_type: string
- title: string
- content: string
- created_at: string (timestamp)

## Relationships
- contacts.company_id -> companies.id
- reminders.company_id -> companies.id
- timeline.company_id -> companies.id (nullable)
