-- Add unique constraint to applicant_id in employees table to prevent duplicates
ALTER TABLE employees ADD CONSTRAINT employees_applicant_id_key UNIQUE (applicant_id);
