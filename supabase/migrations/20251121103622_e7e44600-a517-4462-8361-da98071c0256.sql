-- Fix infinite recursion in user_roles RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- Create new policies WITHOUT using has_role() to avoid recursion
-- Policy 1: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Service role can manage all roles (for admin operations)
CREATE POLICY "Service role can manage roles"
ON user_roles
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Policy 3: Allow authenticated users to check if a user is admin
-- This is safe because it doesn't recurse - it directly checks the table
CREATE POLICY "Allow checking admin status"
ON user_roles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);