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

-- Create policies for companies table (allow all authenticated users to access all data for demo purposes)
CREATE POLICY "Users can access companies" ON companies
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create policies for contacts table (allow all authenticated users to access all data for demo purposes)
CREATE POLICY "Users can access contacts" ON contacts
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create policies for reminders table (allow all authenticated users to access all data for demo purposes)
CREATE POLICY "Users can access reminders" ON reminders
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create policies for timeline table (allow all authenticated users to access all data for demo purposes)
CREATE POLICY "Users can access timeline" ON timeline
FOR ALL USING (auth.uid() IS NOT NULL);
