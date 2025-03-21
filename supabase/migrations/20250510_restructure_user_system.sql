
-- MIGRATION: Restructure User/Project System
-- This migration updates our user and project relationship model
-- to clarify roles and streamline project-based access

-- 1. Update the profiles table structure
-- Remove approver role, simplify to just user and global_admin
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE public.profiles 
  ALTER COLUMN role TYPE TEXT,
  ALTER COLUMN role SET DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT false;

-- 2. Update project_users table to handle project admins
ALTER TABLE public.project_users 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'member';

-- 3. Clean up project_invitations table (we'll manage invites directly)
DROP TABLE IF EXISTS project_invitations;

-- 4. Update RLS Policies
-- First, drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Global admins can view all profiles" ON public.profiles;

-- Create new policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Global admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin');

-- Project user policies
DROP POLICY IF EXISTS "Project users can view their projects" ON public.project_users;
DROP POLICY IF EXISTS "Project admins can manage project users" ON public.project_users;

CREATE POLICY "Project users can view their projects" 
  ON public.project_users 
  FOR SELECT 
  USING (user_id = auth.uid() OR 
         (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin' OR
         EXISTS (SELECT 1 FROM public.project_users 
                WHERE project_id = public.project_users.project_id 
                AND user_id = auth.uid() 
                AND is_admin = true));

CREATE POLICY "Project admins can manage project users" 
  ON public.project_users 
  FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin' OR
         EXISTS (SELECT 1 FROM public.project_users 
                WHERE project_id = public.project_users.project_id 
                AND user_id = auth.uid() 
                AND is_admin = true));

-- 5. Modify Forms visibility based on project
DROP POLICY IF EXISTS "Users can see forms from their projects" ON public.forms;

CREATE POLICY "Users can see forms from their projects" 
  ON public.forms 
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin' OR
         EXISTS (SELECT 1 FROM public.project_users 
                WHERE project_id = public.forms.project_id 
                AND user_id = auth.uid()));

-- 6. Remove project_admins table and migrate data to project_users
-- First, migrate existing project admins
INSERT INTO public.project_users (project_id, user_id, is_admin, status, invited_by, invited_at, created_at, created_by)
SELECT 
  pa.project_id, 
  pa.user_id, 
  true AS is_admin,
  'active' AS status,
  pa.assigned_by AS invited_by,
  pa.assigned_at AS invited_at,
  COALESCE(pa.created_at, NOW()) AS created_at,
  pa.assigned_by AS created_by
FROM 
  public.project_admins pa
WHERE 
  NOT EXISTS (
    SELECT 1 FROM public.project_users pu 
    WHERE pu.project_id = pa.project_id AND pu.user_id = pa.user_id
  );

-- Now drop the project_admins table
DROP TABLE IF EXISTS public.project_admins;

-- 7. Create helper function for authorization
CREATE OR REPLACE FUNCTION public.is_project_admin(user_uuid UUID, project_uuid UUID)
RETURNS BOOLEAN 
LANGUAGE PLPGSQL 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_users
    WHERE user_id = user_uuid 
    AND project_id = project_uuid
    AND is_admin = true
    AND status = 'active'
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
    AND role = 'global_admin'
  );
END;
$$;
