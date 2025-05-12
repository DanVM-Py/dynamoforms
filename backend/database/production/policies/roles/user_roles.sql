CREATE POLICY "Full access for project admins in user Roles"
  ON public.user_roles
FOR ALL
  USING (
    public.is_project_admin(
      auth.uid(), project_id, 'true'
    )
  );