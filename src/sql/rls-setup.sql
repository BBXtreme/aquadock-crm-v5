-- Add user_id column to companies table if it doesn't exist
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add user_id column to contacts table if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Enable Row Level Security on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on reminders table
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on timeline table
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can select their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;

DROP POLICY IF EXISTS "Users can select their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

DROP POLICY IF EXISTS "Users can select their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON reminders;

DROP POLICY IF EXISTS "Users can select their own timeline" ON timeline;
DROP POLICY IF EXISTS "Users can insert timeline" ON timeline;
DROP POLICY IF EXISTS "Users can update their own timeline" ON timeline;
DROP POLICY IF EXISTS "Users can delete their own timeline" ON timeline;

-- Create separate policies for companies table
CREATE POLICY "Users can select their own companies" ON companies
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert companies" ON companies
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own companies" ON companies
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" ON companies
FOR DELETE USING (auth.uid() = user_id);

-- Create separate policies for contacts table
CREATE POLICY "Users can select their own contacts" ON contacts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert contacts" ON contacts
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own contacts" ON contacts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
FOR DELETE USING (auth.uid() = user_id);

-- Create separate policies for reminders table
CREATE POLICY "Users can select their own reminders" ON reminders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert reminders" ON reminders
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own reminders" ON reminders
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON reminders
FOR DELETE USING (auth.uid() = user_id);

-- Create separate policies for timeline table
CREATE POLICY "Users can select their own timeline" ON timeline
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert timeline" ON timeline
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own timeline" ON timeline
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline" ON timeline
FOR DELETE USING (auth.uid() = user_id);

-- Company comments (separate migration): ensure `profiles-table.sql` ran first, then `comments-tables.sql`, `comments-rls.sql`, `comments-trash-alignment.sql`.
