CREATE POLICY "DEV Full access for project admins in user Roles"
  ON public.dev_user_roles
FOR ALL
  USING (
    public.is_project_admin(
      auth.uid(), project_id, 'false'
    )
  );