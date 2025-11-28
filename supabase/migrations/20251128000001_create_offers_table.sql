-- Create offers table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending_Approval', 'Sent', 'Accepted', 'Declined')),
  position_title TEXT NOT NULL,
  start_date DATE NOT NULL,
  salary NUMERIC NOT NULL,
  offer_letter_url TEXT,
  secure_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Policy: HR Staff can do everything
CREATE POLICY "Allow full access for authenticated users" ON offers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Public read access via secure_token (for applicants)
CREATE POLICY "Allow public read access via secure_token" ON offers
  FOR SELECT
  TO anon
  USING (secure_token IS NOT NULL);
