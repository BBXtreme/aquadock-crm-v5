-- Add role column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Add role column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Enable Row Level Security on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on reminders table
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on timeline table
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own companies or admins can read all" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies or admins can update all" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies or admins can delete all" ON companies;

DROP POLICY IF EXISTS "Users can read their own contacts or admins can read all" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts or admins can update all" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts or admins can delete all" ON contacts;

DROP POLICY IF EXISTS "Users can read their own reminders or admins can read all" ON reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update their own reminders or admins can update all" ON reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders or admins can delete all" ON reminders;

DROP POLICY IF EXISTS "Users can read their own timeline or admins can read all" ON timeline;
DROP POLICY IF EXISTS "Users can insert their own timeline" ON timeline;
DROP POLICY IF EXISTS "Users can update their own timeline or admins can update all" ON timeline;
DROP POLICY IF EXISTS "Users can delete their own timeline or admins can delete all" ON timeline;

-- Create policies for companies table
CREATE POLICY "Users can read their own companies or admins can read all" ON companies
FOR SELECT USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can insert their own companies" ON companies
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies or admins can update all" ON companies
FOR UPDATE USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can delete their own companies or admins can delete all" ON companies
FOR DELETE USING (auth.uid() = user_id OR role = 'admin');

-- Create policies for contacts table
CREATE POLICY "Users can read their own contacts or admins can read all" ON contacts
FOR SELECT USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can insert their own contacts" ON contacts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts or admins can update all" ON contacts
FOR UPDATE USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can delete their own contacts or admins can delete all" ON contacts
FOR DELETE USING (auth.uid() = user_id OR role = 'admin');

-- Create policies for reminders table
CREATE POLICY "Users can read their own reminders or admins can read all" ON reminders
FOR SELECT USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can insert their own reminders" ON reminders
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders or admins can update all" ON reminders
FOR UPDATE USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can delete their own reminders or admins can delete all" ON reminders
FOR DELETE USING (auth.uid() = user_id OR role = 'admin');

-- Create policies for timeline table
CREATE POLICY "Users can read their own timeline or admins can read all" ON timeline
FOR SELECT USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can insert their own timeline" ON timeline
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline or admins can update all" ON timeline
FOR UPDATE USING (auth.uid() = user_id OR role = 'admin');

CREATE POLICY "Users can delete their own timeline or admins can delete all" ON timeline
FOR DELETE USING (auth.uid() = user_id OR role = 'admin');

-- Assign admin role to a specific user (replace 'user@example.com' with actual admin email)
-- This is an example; in production, you might want to do this via UI or separate script
-- UPDATE companies SET role = 'admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
-- UPDATE contacts SET role = 'admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
