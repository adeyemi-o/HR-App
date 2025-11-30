-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow all authenticated users to view settings (needed for app logic)
CREATE POLICY "Authenticated users can view settings"
    ON settings FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to update settings (will be restricted to admins later)
CREATE POLICY "Authenticated users can update settings"
    ON settings FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Insert default settings
INSERT INTO settings (key, value, description, is_encrypted)
VALUES 
    ('wp_api_url', '', 'WordPress API URL', false),
    ('wp_username', '', 'WordPress Username', false),
    ('wp_app_password', '', 'WordPress Application Password', true),
    ('company_name', 'Prolific Homecare', 'Company Name', false),
    ('company_email', 'hr@prolifichomecare.com', 'Company Email', false)
ON CONFLICT (key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
