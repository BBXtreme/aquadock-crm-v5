-- Enable Row Level Security on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add user_id column to companies table if it doesn't exist
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can access their own companies" ON companies;

-- Create policy for companies: users can only access their own records
CREATE POLICY "Users can access their own companies" ON companies
FOR ALL USING (auth.uid() = user_id);

-- Enable Row Level Security on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Add user_id column to contacts table if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can access their own contacts" ON contacts;

-- Create policy for contacts: users can only access their own records
CREATE POLICY "Users can access their own contacts" ON contacts
FOR ALL USING (auth.uid() = user_id);
