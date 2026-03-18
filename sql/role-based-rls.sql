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
DROP POLICY IF EXISTS "Users can access their own companies" ON companies;

DROP POLICY IF EXISTS "Users can access their own contacts" ON contacts;

DROP POLICY IF EXISTS "Users can access their own reminders" ON reminders;

DROP POLICY IF EXISTS "Users can access their own timeline" ON timeline;

-- Create policies for companies table
CREATE POLICY "Users can access their own companies" ON companies
FOR ALL USING (auth.uid() = user_id);

-- Create policies for contacts table
CREATE POLICY "Users can access their own contacts" ON contacts
FOR ALL USING (auth.uid() = user_id);

-- Create policies for reminders table
CREATE POLICY "Users can access their own reminders" ON reminders
FOR ALL USING (auth.uid() = user_id);

-- Create policies for timeline table
CREATE POLICY "Users can access their own timeline" ON timeline
FOR ALL USING (auth.uid() = user_id);
