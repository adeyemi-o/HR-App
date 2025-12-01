-- Fix RLS Infinite Recursion using Security Definer Function

-- 1. Create a secure function to check role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Allow profile viewing" ON profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON profiles;

-- 3. Create new recursion-safe policies
CREATE POLICY "Allow profile viewing"
    ON profiles FOR SELECT
    USING (
        auth.uid() = id
        OR 
        get_my_role() = 'admin'
        OR
        get_my_role() = 'hr'
    );

CREATE POLICY "Allow profile updates"
    ON profiles FOR UPDATE
    USING (
        auth.uid() = id
        OR 
        get_my_role() = 'admin'
    );

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
