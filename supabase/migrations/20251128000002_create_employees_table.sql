-- Create employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  department TEXT,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'Onboarding' CHECK (status IN ('Active', 'Onboarding', 'Terminated')),
  employee_id TEXT UNIQUE, -- Custom ID like EMP-001
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create Policy: Allow read/write for authenticated users (HR Staff)
CREATE POLICY "Allow all access for authenticated users" ON employees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
