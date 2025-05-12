CREATE POLICY "DEV Global admins can view all projects" 
  ON public.dev_projects
  FOR ALL
  USING (
    public.is_global_admin(
      auth.uid(), 'false'
    )
);