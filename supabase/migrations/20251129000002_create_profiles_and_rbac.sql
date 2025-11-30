-- Create user_role enum
CREATE TYPE user_role AS ENUM ('admin', 'staff');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role DEFAULT 'staff'::user_role,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff'::user_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update Settings Policies (Admin only update)
DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
CREATE POLICY "Admins can update settings"
    ON settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Update Offers Policies (Admin only insert/update/delete)
-- First, ensure RLS is enabled (it should be, but good to be safe)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view offers"
    ON offers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert offers"
    ON offers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update offers"
    ON offers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete offers"
    ON offers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Update Employees Policies (Admin only insert/update/delete)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view employees"
    ON employees FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage employees"
    ON employees FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
