-- Create archive table mirroring applicants structure
CREATE TABLE applicants_archive (
  id UUID PRIMARY KEY,
  airtable_id TEXT,
  jotform_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position_applied TEXT,
  status TEXT NOT NULL,
  resume_url TEXT,
  wp_user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT DEFAULT '3-month retention policy'
);

-- Create offers archive table (since offers CASCADE on applicant deletion)
CREATE TABLE offers_archive (
  id UUID PRIMARY KEY,
  applicant_id UUID NOT NULL,
  status TEXT NOT NULL,
  position_title TEXT NOT NULL,
  start_date DATE,
  salary NUMERIC(10,2),
  offer_letter_url TEXT,
  secure_token TEXT UNIQUE NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT DEFAULT 'applicant archived'
);

-- Indexes for efficient queries
CREATE INDEX idx_applicants_archive_email ON applicants_archive(email);
CREATE INDEX idx_applicants_archive_archived_at ON applicants_archive(archived_at);
CREATE INDEX idx_applicants_archive_status ON applicants_archive(status);
CREATE INDEX idx_offers_archive_applicant_id ON offers_archive(applicant_id);

-- RLS Policies (admin-only access)
ALTER TABLE applicants_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to applicants_archive"
ON applicants_archive
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin access to offers_archive"
ON offers_archive
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add helpful comments
COMMENT ON TABLE applicants_archive IS 'Archive of old applicants (3-month retention policy)';
COMMENT ON TABLE offers_archive IS 'Archive of offers linked to archived applicants';
