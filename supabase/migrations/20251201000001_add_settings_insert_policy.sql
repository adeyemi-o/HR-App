-- Allow authenticated users to insert settings (needed for upsert)
CREATE POLICY "Authenticated users can insert settings"
    ON settings FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
