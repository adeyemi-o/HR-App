-- Insert integration settings
INSERT INTO settings (key, value, description, is_encrypted)
VALUES 
    ('jotform_api_key', '', 'JotForm API Key', true),
    ('jotform_form_id_application', '241904161216448', 'JotForm Application Form ID', false),
    ('jotform_form_id_emergency', '241904172937460', 'JotForm Emergency Contact Form ID', false),
    ('jotform_form_id_i9', '241904132956457', 'JotForm I-9 Form ID', false),
    ('jotform_form_id_vaccination', '241903896305461', 'JotForm Vaccination Form ID', false),
    ('jotform_form_id_licenses', '241904101484449', 'JotForm Licenses Form ID', false),
    ('jotform_form_id_background', '241903864179465', 'JotForm Background Check Form ID', false),
    ('brevo_api_key', '', 'Brevo API Key', true)
ON CONFLICT (key) DO NOTHING;
