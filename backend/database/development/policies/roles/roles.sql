CREATE POLICY "DEV Full access for project admins in Roles"
  ON public.dev_roles
FOR ALL
  USING (
    public.is_project_admin(
      auth.uid(), project_id, 'false'
    )
  );
