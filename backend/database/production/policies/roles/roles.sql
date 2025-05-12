CREATE POLICY "Full access for project admins in Roles"
  ON public.roles
FOR ALL
  USING (
    public.is_project_admin(
      auth.uid(), project_id, 'true'
    )
  );
