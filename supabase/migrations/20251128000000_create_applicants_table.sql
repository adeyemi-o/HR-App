-- Create applicants table
CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  position_applied TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected')),
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- Create Policy: Allow read/write for authenticated users (HR Staff)
CREATE POLICY "Allow all access for authenticated users" ON applicants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
