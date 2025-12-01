-- Fix RLS policies for profiles to allow admins to see all users
-- The issue is conflicting policies from previous migrations

-- Drop ALL existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Drop ALL existing UPDATE policies on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Create a single, comprehensive SELECT policy
-- Admins can see all profiles, regular users can see their own
CREATE POLICY "Allow profile viewing"
    ON profiles FOR SELECT
    USING (
        auth.uid() = id  -- Users can always see their own profile
        OR 
        EXISTS (  -- OR user is an admin (can see all profiles)
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Create a single, comprehensive UPDATE policy  
-- Admins can update any profile, regular users can update their own
CREATE POLICY "Allow profile updates"
    ON profiles FOR UPDATE
    USING (
        auth.uid() = id  -- Users can always update their own profile
        OR 
        EXISTS (  -- OR user is an admin (can update any profile)
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );
