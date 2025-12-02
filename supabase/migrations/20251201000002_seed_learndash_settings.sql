-- Insert WordPress and LearnDash settings
-- Note: wp_api_url, wp_username, wp_app_password might already exist from previous migration, 
-- but we ensure they are present.
INSERT INTO settings (key, value, description, is_encrypted)
VALUES 
    ('wp_api_url', 'https://training.prolifichomecare.com/wp-json', 'WordPress API URL', false),
    ('wp_username', '', 'WordPress Admin Username', false),
    ('wp_app_password', '', 'WordPress Application Password', true),
    ('learndash_group_map', '{
    "Licensed Practical Nurse (LPN)": [],
    "Direct Care Worker": [],
    "Registered Nurse (RN)": []
}', 'Map of Position to LearnDash Group IDs (Array)', false)
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
