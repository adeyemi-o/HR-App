-- Add 'hr' as a valid role option
-- This migration extends the role check constraint to include 'hr'

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'hr', 'staff'));
