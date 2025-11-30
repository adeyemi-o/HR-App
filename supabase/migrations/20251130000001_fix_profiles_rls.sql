-- Create a secure function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the profiles policies to use the function to avoid recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin() OR auth.uid() = id); -- Also allow users to view their own profile

CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (is_admin());
